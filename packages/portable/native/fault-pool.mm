// Test-only callback interposer. Never linked into the production helper.
#import <VideoToolbox/VideoToolbox.h>
#include <unistd.h>

static VTCompressionOutputCallback callback;
static void* context;

static void deliver(void*, void* frame, OSStatus status, VTEncodeInfoFlags flags, CMSampleBufferRef sample) {
#if defined(HELIOS_POOL_DELAY)
    usleep(20000);
#elif defined(HELIOS_POOL_DROP)
    flags |= kVTEncodeInfo_FrameDropped;
#elif defined(HELIOS_POOL_ERROR)
    status = kVTVideoEncoderMalfunctionErr;
#elif defined(HELIOS_POOL_ORDER)
    static CMSampleBufferRef held = nullptr;
    static void* heldFrame = nullptr;
    if (uintptr_t(frame) == 1) { held = sample; if (held) CFRetain(held); heldFrame = frame; return; }
    if (held) {
        callback(context, frame, status, flags, sample);
        callback(context, heldFrame, status, flags, held);
        CFRelease(held); held = nullptr; return;
    }
#endif
    callback(context, frame, status, flags, sample);
#if defined(HELIOS_POOL_DUPLICATE)
    callback(context, frame, status, flags, sample);
#endif
}

static OSStatus create(CFAllocatorRef allocator, int32_t width, int32_t height, CMVideoCodecType codec,
    CFDictionaryRef specification, CFDictionaryRef attributes, CFAllocatorRef compressedAllocator,
    VTCompressionOutputCallback originalCallback, void* originalContext, VTCompressionSessionRef* output) {
    callback = originalCallback; context = originalContext;
    // DYLD does not interpose an entry's replacee inside its own image.
    return VTCompressionSessionCreate(allocator, width, height, codec, specification, attributes, compressedAllocator, deliver, nullptr, output);
}
__attribute__((used)) static struct { const void* replacement; const void* replacee; } createHook
__attribute__((section("__DATA,__interpose"))) = { (const void*)&create, (const void*)&VTCompressionSessionCreate };

#if defined(HELIOS_POOL_SYNC)
static OSStatus encode(VTCompressionSessionRef session, CVImageBufferRef buffer, CMTime pts, CMTime duration,
    CFDictionaryRef properties, void* frame, VTEncodeInfoFlags* flags) {
    const auto result = VTCompressionSessionEncodeFrame(session, buffer, pts, duration, properties, frame, flags);
    return result ? result : VTCompressionSessionCompleteFrames(session, pts);
}
__attribute__((used)) static struct { const void* replacement; const void* replacee; } encodeHook
__attribute__((section("__DATA,__interpose"))) = { (const void*)&encode, (const void*)&VTCompressionSessionEncodeFrame };
#endif
