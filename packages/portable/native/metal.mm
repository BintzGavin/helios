#import <Foundation/Foundation.h>
#import <Metal/Metal.h>
#import <CoreVideo/CoreVideo.h>
#import <VideoToolbox/VideoToolbox.h>
#import <IOSurface/IOSurface.h>
#include <cstdio>
#include <memory>
#include <mutex>
#include <atomic>
#include <algorithm>
#include "encoder-flight.hpp"

// The encoder receives the exact IOSurface-backed NV12 buffer written by Metal.
// CPU access is restricted to compressed packets; raw pixels are never mapped.
struct State {
    id<MTLDevice> device;
    id<MTLCommandQueue> queue;
    id<MTLTexture> rgba;
    id<MTLComputePipelineState> conversion;
    CVMetalTextureCacheRef cache = nullptr;
    CVPixelBufferRef buffer = nullptr;
    VTCompressionSessionRef encoder = nullptr;
    dispatch_semaphore_t completed = dispatch_semaphore_create(0);
    FILE* output = nullptr;
    FILE* trace = nullptr;
    bool capturing = false;
    bool finished = false;
    std::mutex callbackMutex;
    HeliosEncoderFlight flight;
    struct HeldBuffer { CVPixelBufferRef buffer = nullptr; uint32_t frame = 0; };
    std::array<HeldBuffer, 3> held{};
    uint32_t encoderPool;
    uint32_t bitrate;
    bool hevc = false;
    uint32_t width, height, num, den;
    std::atomic<bool> failed{false};
    explicit State(uint32_t pool) : flight(pool), encoderPool(pool) {}
    ~State() {
        if (encoder) { if (!finished) VTCompressionSessionCompleteFrames(encoder, kCMTimeInvalid); VTCompressionSessionInvalidate(encoder); CFRelease(encoder); }
        for (auto& slot : held) if (slot.buffer) CVPixelBufferRelease(slot.buffer);
        if (buffer) CVPixelBufferRelease(buffer);
        if (cache) CFRelease(cache);
        if (output) fclose(output);
        if (capturing) [[MTLCaptureManager sharedCaptureManager] stopCapture];
        if (trace) fclose(trace);
    }
};

static void packet(void* ref, void* frame, OSStatus status, VTEncodeInfoFlags flags, CMSampleBufferRef sample) {
    auto* state = static_cast<State*>(ref);
    std::lock_guard<std::mutex> guard(state->callbackMutex);
    const auto index = uint32_t(uintptr_t(frame) - 1);
    const auto surface = state->flight.surface(index);
    if (!state->flight.complete(index, !status && sample && !(flags & kVTEncodeInfo_FrameDropped))) state->failed = true;
    if (state->trace) fprintf(state->trace, "{\"event\":\"encoder-callback\",\"frame\":%u,\"surfaceId\":%u,\"status\":%d,\"dropped\":%s}\n", index, surface.value_or(0), (int)status, (flags & kVTEncodeInfo_FrameDropped) ? "true" : "false");
    if (!state->failed && state->output) {
        auto format = CMSampleBufferGetFormatDescription(sample);
        size_t count = 0; int lengthSize = 0;
        auto parameterSet = state->hevc ? CMVideoFormatDescriptionGetHEVCParameterSetAtIndex : CMVideoFormatDescriptionGetH264ParameterSetAtIndex;
        if (!format || CMVideoFormatDescriptionGetCodecType(format) != (state->hevc ? kCMVideoCodecType_HEVC : kCMVideoCodecType_H264) || parameterSet(format, 0, nullptr, nullptr, &count, &lengthSize) || count < (state->hevc ? 3u : 2u) || count > 64 || lengthSize != 4) state->failed = true;
        const uint8_t start[] = {0, 0, 0, 1};
        for (size_t i = 0; !state->failed && i < count; ++i) {
            const uint8_t* bytes; size_t length;
            if (parameterSet(format, i, &bytes, &length, nullptr, nullptr) || !bytes || !length || fwrite(start, 1, 4, state->output) != 4 || fwrite(bytes, 1, length, state->output) != length) state->failed = true;
        }
        auto block = CMSampleBufferGetDataBuffer(sample);
        if (!block) state->failed = true;
        const size_t total = block ? CMBlockBufferGetDataLength(block) : 0;
        if (!total) state->failed = true;
        size_t cursor = 0;
        while (!state->failed && cursor < total) {
            uint8_t prefix[4];
            if (lengthSize != 4 || total - cursor < 4 || CMBlockBufferCopyDataBytes(block, cursor, 4, prefix)) { state->failed = true; break; }
            size_t length = (size_t(prefix[0]) << 24) | (size_t(prefix[1]) << 16) | (size_t(prefix[2]) << 8) | prefix[3];
            cursor += 4;
            if (!length || length > total - cursor) { state->failed = true; break; }
            // This copy is compressed output, explicitly outside the raw-frame claim.
            auto bytes = std::make_unique<uint8_t[]>(length);
            if (CMBlockBufferCopyDataBytes(block, cursor, length, bytes.get()) || fwrite(start, 1, 4, state->output) != 4 || fwrite(bytes.get(), 1, length, state->output) != length) state->failed = true;
            cursor += length;
        }
    }
    // Keep an application reference through the complete callback body. The
    // encoder may retain it longer; only CoreVideo's pool decides final reuse.
    for (auto& slot : state->held) if (slot.buffer && slot.frame == index) {
        CVPixelBufferRelease(slot.buffer); slot.buffer = nullptr;
        if (state->trace) fprintf(state->trace, "{\"event\":\"callback-owner-release\",\"frame\":%u,\"surfaceId\":%u}\n", index, surface.value_or(0));
        break;
    }
    dispatch_semaphore_signal(state->completed);
}

static const char* shader = R"metal(
#include <metal_stdlib>
using namespace metal;
float3 transfer(float3 s) {
    float3 linear = select(pow((s + 0.055f) / 1.055f, float3(2.4f)), s / 12.92f, s <= 0.04045f);
    return select(1.099f * pow(linear, float3(0.45f)) - 0.099f, 4.5f * linear, linear < 0.018f);
}
kernel void convert(texture2d<float, access::read> rgba [[texture(0)]],
                    texture2d<float, access::write> y [[texture(1)]],
                    texture2d<float, access::write> uv [[texture(2)]], uint2 p [[thread_position_in_grid]]) {
    if (p.x >= uv.get_width() || p.y >= uv.get_height()) return;
    float2 chroma = 0;
    for (uint dy = 0; dy < 2; ++dy) for (uint dx = 0; dx < 2; ++dx) {
        uint2 q = 2 * p + uint2(dx, dy);
        float3 rgb = transfer(clamp(rgba.read(q).rgb, 0.0f, 1.0f));
        float luma = dot(rgb, float3(0.2126f, 0.7152f, 0.0722f));
        y.write(float4((16.0f + 219.0f * luma) / 255.0f), q);
        chroma += float2((rgb.b - luma) / 1.8556f, (rgb.r - luma) / 1.5748f);
    }
    uv.write(float4((128.0f + 56.0f * chroma) / 255.0f, 0, 1), p);
}
)metal";

extern "C" void* helios_create(uint32_t w, uint32_t h, uint32_t num, uint32_t den, uint32_t bitrate, uint32_t gop, uint32_t encoderPool, bool hevc, const char* path, bool hardware, const char* trace, const char* capture) {
    @autoreleasepool {
        auto state = std::make_unique<State>(encoderPool);
        state->width = w; state->height = h; state->num = num; state->den = den;
        state->bitrate = bitrate;
        state->hevc = hevc;
        state->device = MTLCreateSystemDefaultDevice();
        if (!state->device) return nullptr;
        state->queue = [state->device newCommandQueue];
        if (trace[0]) { state->trace = fopen(trace, "wb"); if (!state->trace) return nullptr; }
        if (capture[0]) {
            auto manager = [MTLCaptureManager sharedCaptureManager];
            if (![manager supportsDestination:MTLCaptureDestinationGPUTraceDocument]) { fprintf(stderr, "GPU_CAPTURE_UNAVAILABLE\n"); return nullptr; }
            auto descriptor = [MTLCaptureDescriptor new];
            descriptor.captureObject = state->queue;
            descriptor.destination = MTLCaptureDestinationGPUTraceDocument;
            descriptor.outputURL = [NSURL fileURLWithPath:[NSString stringWithUTF8String:capture]];
            NSError* error = nil;
            if (![manager startCaptureWithDescriptor:descriptor error:&error]) { fprintf(stderr, "GPU_CAPTURE_FAILED\n"); return nullptr; }
            state->capturing = true;
        }
        auto descriptor = [MTLTextureDescriptor texture2DDescriptorWithPixelFormat:MTLPixelFormatRGBA8Unorm width:w height:h mipmapped:NO];
        descriptor.usage = MTLTextureUsageRenderTarget | MTLTextureUsageShaderRead;
        descriptor.storageMode = MTLStorageModePrivate;
        state->rgba = [state->device newTextureWithDescriptor:descriptor];
        NSError* error = nil;
        auto library = [state->device newLibraryWithSource:[NSString stringWithUTF8String:shader] options:nil error:&error];
        if (!library) return nullptr;
        state->conversion = [state->device newComputePipelineStateWithFunction:[library newFunctionWithName:@"convert"] error:&error];
        if (!state->queue || !state->rgba || !state->conversion) return nullptr;
        if (!hardware) return state.release();
        NSDictionary* attributes = @{(id)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange), (id)kCVPixelBufferWidthKey: @(w), (id)kCVPixelBufferHeightKey: @(h), (id)kCVPixelBufferMetalCompatibilityKey: @YES, (id)kCVPixelBufferIOSurfacePropertiesKey: @{}};
        NSDictionary* specification = @{(id)kVTVideoEncoderSpecification_RequireHardwareAcceleratedVideoEncoder: @YES};
        if (VTCompressionSessionCreate(nullptr, w, h, hevc ? kCMVideoCodecType_HEVC : kCMVideoCodecType_H264, (__bridge CFDictionaryRef)specification, (__bridge CFDictionaryRef)attributes, nullptr, packet, state.get(), &state->encoder)) return nullptr;
        double rate = double(num) / den;
        NSMutableDictionary* properties = [@{(id)kVTCompressionPropertyKey_AverageBitRate: @(bitrate), (id)kVTCompressionPropertyKey_ExpectedFrameRate: @(rate), (id)kVTCompressionPropertyKey_AllowFrameReordering: @NO, (id)kVTCompressionPropertyKey_MaxKeyFrameInterval: @(gop), (id)kVTCompressionPropertyKey_ColorPrimaries: (id)kCVImageBufferColorPrimaries_ITU_R_709_2, (id)kVTCompressionPropertyKey_TransferFunction: (id)kCVImageBufferTransferFunction_ITU_R_709_2, (id)kVTCompressionPropertyKey_YCbCrMatrix: (id)kCVImageBufferYCbCrMatrix_ITU_R_709_2} mutableCopy];
        if (hevc) properties[(id)kVTCompressionPropertyKey_ProfileLevel] = (id)kVTProfileLevel_HEVC_Main_AutoLevel;
        if (VTSessionSetProperties(state->encoder, (__bridge CFDictionaryRef)properties) || VTCompressionSessionPrepareToEncodeFrames(state->encoder)) return nullptr;
        CFTypeRef configured = nullptr;
        if (VTSessionCopyProperty(state->encoder, kVTCompressionPropertyKey_AverageBitRate, nullptr, &configured) || !configured) return nullptr;
        int64_t configuredBitrate = 0;
        const bool accepted = CFGetTypeID(configured) == CFNumberGetTypeID() && CFNumberGetValue((CFNumberRef)configured, kCFNumberSInt64Type, &configuredBitrate) && configuredBitrate == bitrate;
        CFRelease(configured);
        if (!accepted) { fprintf(stderr, "GPU_BITRATE_REJECTED\n"); return nullptr; }
        CFTypeRef used = nullptr;
        if (VTSessionCopyProperty(state->encoder, kVTCompressionPropertyKey_UsingHardwareAcceleratedVideoEncoder, nullptr, &used) || !used) return nullptr;
        const bool hardware = CFEqual(used, kCFBooleanTrue); CFRelease(used);
        if (!hardware) return nullptr;
        auto pool = VTCompressionSessionGetPixelBufferPool(state->encoder);
        NSDictionary* poolAttributes = @{(id)kCVPixelBufferPoolAllocationThresholdKey: @(encoderPool)};
        if (!pool || CVPixelBufferPoolCreatePixelBufferWithAuxAttributes(nullptr, pool, (__bridge CFDictionaryRef)poolAttributes, &state->buffer) || !CVPixelBufferGetIOSurface(state->buffer)) return nullptr;
        if (CVMetalTextureCacheCreate(nullptr, nullptr, state->device, nullptr, &state->cache)) return nullptr;
        if (state->trace) fprintf(state->trace, "{\"event\":\"surface-create\",\"surfaceId\":%u,\"protocol\":%u,\"codec\":\"%s\",\"hardwareRequired\":true,\"hardwareUsed\":true,\"bitrate\":%u,\"configuredBitrate\":%u,\"gop\":%u,\"encoderPool\":true,\"poolCapacity\":%u,\"format\":\"nv12-video-range\",\"rasterStorage\":\"private\",\"rawCpuMapCallsInBridge\":0}\n", IOSurfaceGetID(CVPixelBufferGetIOSurface(state->buffer)), hevc ? 6 : 4, hevc ? "hevc" : "h264", bitrate, bitrate, gop, encoderPool);
        if (path[0]) { state->output = fopen(path, "wb"); if (!state->output) return nullptr; }
        return state.release();
    }
}
extern "C" void* helios_device(State* state) { return (__bridge void*)state->device; }
extern "C" void* helios_queue(State* state) { return (__bridge void*)state->queue; }
extern "C" void* helios_texture(State* state) { return (__bridge void*)state->rgba; }
extern "C" bool helios_hardware(State*) { return true; }
extern "C" uint32_t helios_configured_bitrate(State* state) { return state->bitrate; }
extern "C" void helios_raster_submitted(State* state, uint32_t index) {
    if (state->trace) fprintf(state->trace, "{\"event\":\"raster-submitted\",\"frame\":%u}\n", index);
}
extern "C" bool helios_convert(State* state, uint32_t index) {
    @autoreleasepool {
        CVMetalTextureRef luma = nullptr, chroma = nullptr;
        if (CVMetalTextureCacheCreateTextureFromImage(nullptr, state->cache, state->buffer, nullptr, MTLPixelFormatR8Unorm, state->width, state->height, 0, &luma)) return false;
        if (CVMetalTextureCacheCreateTextureFromImage(nullptr, state->cache, state->buffer, nullptr, MTLPixelFormatRG8Unorm, state->width / 2, state->height / 2, 1, &chroma)) { CFRelease(luma); return false; }
        auto source = CVPixelBufferGetIOSurface(state->buffer);
        auto y = CVMetalTextureGetTexture(luma), uv = CVMetalTextureGetTexture(chroma);
        if (y.iosurface != source || uv.iosurface != source || y.iosurfacePlane != 0 || uv.iosurfacePlane != 1) { CFRelease(luma); CFRelease(chroma); return false; }
        auto command = [state->queue commandBuffer];
        command.label = @"Helios sRGB to BT709 NV12";
        auto compute = [command computeCommandEncoder];
        [compute setComputePipelineState:state->conversion];
        [compute setTexture:state->rgba atIndex:0];
        [compute setTexture:CVMetalTextureGetTexture(luma) atIndex:1];
        [compute setTexture:CVMetalTextureGetTexture(chroma) atIndex:2];
        [compute dispatchThreads:MTLSizeMake(state->width / 2, state->height / 2, 1) threadsPerThreadgroup:MTLSizeMake(8, 8, 1)];
        [compute endEncoding]; [command commit]; [command waitUntilCompleted];
        CFRelease(luma); CFRelease(chroma);
        if (command.status != MTLCommandBufferStatusCompleted) return false;
        if (state->trace) fprintf(state->trace, "{\"event\":\"conversion-complete\",\"frame\":%u,\"surfaceId\":%u,\"sameIOSurfacePlanes\":true,\"gpuStartSeconds\":%.9f,\"gpuEndSeconds\":%.9f}\n", index, IOSurfaceGetID(source), command.GPUStartTime, command.GPUEndTime);
        CVBufferSetAttachment(state->buffer, kCVImageBufferColorPrimariesKey, kCVImageBufferColorPrimaries_ITU_R_709_2, kCVAttachmentMode_ShouldPropagate);
        CVBufferSetAttachment(state->buffer, kCVImageBufferTransferFunctionKey, kCVImageBufferTransferFunction_ITU_R_709_2, kCVAttachmentMode_ShouldPropagate);
        CVBufferSetAttachment(state->buffer, kCVImageBufferYCbCrMatrixKey, kCVImageBufferYCbCrMatrix_ITU_R_709_2, kCVAttachmentMode_ShouldPropagate);
        return true;
    }
}
extern "C" bool helios_reference(State* state, uint32_t index) {
    if (!helios_convert(state, index)) return false;
    if (CVPixelBufferLockBaseAddress(state->buffer, kCVPixelBufferLock_ReadOnly)) return false;
    bool ok = true;
    for (size_t plane = 0; plane < 2; ++plane) {
        const size_t rows = plane == 0 ? state->height : state->height / 2;
        const size_t stride = CVPixelBufferGetBytesPerRowOfPlane(state->buffer, plane);
        auto* base = static_cast<const uint8_t*>(CVPixelBufferGetBaseAddressOfPlane(state->buffer, plane));
        if (!base) { ok = false; break; }
        for (size_t row = 0; row < rows; ++row) if (fwrite(base + row * stride, 1, state->width, stdout) != state->width) { ok = false; break; }
    }
    if (state->trace) fprintf(state->trace, "{\"event\":\"reference-cpu-readback\",\"frame\":%u,\"bytes\":%llu}\n", index, (unsigned long long)state->width * state->height * 3 / 2);
    CVPixelBufferUnlockBaseAddress(state->buffer, kCVPixelBufferLock_ReadOnly);
    return ok;
}
extern "C" bool helios_encode(State* state, uint32_t index) {
    @autoreleasepool {
        if (state->failed) return false;
        if (!state->buffer) {
            auto pool = VTCompressionSessionGetPixelBufferPool(state->encoder);
            NSDictionary* attributes = @{(id)kCVPixelBufferPoolAllocationThresholdKey: @(state->encoderPool)};
            auto result = CVPixelBufferPoolCreatePixelBufferWithAuxAttributes(nullptr, pool, (__bridge CFDictionaryRef)attributes, &state->buffer);
            if (result == kCVReturnWouldExceedAllocationThreshold) {
                std::optional<uint32_t> oldest;
                { std::lock_guard<std::mutex> guard(state->callbackMutex); oldest = state->flight.oldest(); }
                if (state->trace) fprintf(state->trace, "{\"event\":\"pool-backpressure\",\"frame\":%u,\"oldestFrame\":%lld,\"capacity\":%u}\n", index, oldest ? int64_t(*oldest) : -1LL, state->encoderPool);
                // Drain once, outside the callback mutex. The texture cache can
                // retain plane wrappers; release cached holds before one retry.
                const auto until = oldest ? CMTimeMake(int64_t(*oldest) * state->den, state->num) : kCMTimeInvalid;
                if (VTCompressionSessionCompleteFrames(state->encoder, until)) return false;
                CVMetalTextureCacheFlush(state->cache, 0);
                result = CVPixelBufferPoolCreatePixelBufferWithAuxAttributes(nullptr, pool, (__bridge CFDictionaryRef)attributes, &state->buffer);
            }
            if (result || !state->buffer || !CVPixelBufferGetIOSurface(state->buffer)) return false;
        }
        if (state->encoderPool == 3 && state->trace) {
            std::lock_guard<std::mutex> guard(state->callbackMutex);
            fprintf(state->trace, "{\"event\":\"surface-acquire\",\"frame\":%u,\"surfaceId\":%u,\"fromEncoderPool\":true}\n", index, IOSurfaceGetID(CVPixelBufferGetIOSurface(state->buffer)));
        }
        if (!helios_convert(state, index)) return false;
        auto source = CVPixelBufferGetIOSurface(state->buffer);
        {
            std::lock_guard<std::mutex> guard(state->callbackMutex);
            if (!state->flight.begin(index, IOSurfaceGetID(source))) { state->failed = true; return false; }
            if (state->encoderPool == 3) {
                auto slot = std::find_if(state->held.begin(), state->held.end(), [](const State::HeldBuffer& entry) { return !entry.buffer; });
                if (slot == state->held.end()) { state->failed = true; return false; }
                slot->frame = index; slot->buffer = CVPixelBufferRetain(state->buffer);
            }
        }
        if (state->trace) fprintf(state->trace, "{\"event\":\"encoder-submit\",\"frame\":%u,\"surfaceId\":%u}\n", index, IOSurfaceGetID(source));
        // A callback may run before this returns. Never hold callbackMutex here.
        VTEncodeInfoFlags flags = 0;
        if (VTCompressionSessionEncodeFrame(state->encoder, state->buffer, CMTimeMake(int64_t(index) * state->den, state->num), CMTimeMake(state->den, state->num), nullptr, reinterpret_cast<void*>(uintptr_t(index) + 1), &flags) || (flags & kVTEncodeInfo_FrameDropped)) { state->failed = true; return false; }
        if (state->encoderPool == 3) {
            const auto surfaceId = IOSurfaceGetID(source);
            CVPixelBufferRelease(state->buffer); state->buffer = nullptr;
            if (state->trace) fprintf(state->trace, "{\"event\":\"application-surface-release\",\"frame\":%u,\"surfaceId\":%u,\"encoderMayRetain\":true}\n", index, surfaceId);
            return !state->failed;
        }
        // CompleteFrames ensures asynchronous callbacks finish before this buffer is reused.
        if (VTCompressionSessionCompleteFrames(state->encoder, kCMTimeInvalid)) return false;
        if (dispatch_semaphore_wait(state->completed, dispatch_time(DISPATCH_TIME_NOW, 30 * NSEC_PER_SEC))) return false;
        if (state->trace) { fprintf(state->trace, "{\"event\":\"surface-recyclable\",\"frame\":%u,\"surfaceId\":%u}\n", index, IOSurfaceGetID(source)); fflush(state->trace); }
        return !state->failed;
    }
}
extern "C" bool helios_finish(State* state, uint32_t count) {
    if (VTCompressionSessionCompleteFrames(state->encoder, kCMTimeInvalid)) return false;
    std::lock_guard<std::mutex> guard(state->callbackMutex);
    state->finished = true;
    const bool ok = !state->failed && state->flight.finish(count);
    if (state->trace) { fprintf(state->trace, "{\"event\":\"encoder-finish\",\"frames\":%u,\"capacity\":%u,\"peakInFlight\":%u,\"allCallbacksComplete\":%s}\n", count, state->encoderPool, state->flight.peak(), ok ? "true" : "false"); fflush(state->trace); }
    return ok;
}
extern "C" bool helios_close(State* state) { if (!state) return false; bool ok = !state->failed; delete state; return ok; }
