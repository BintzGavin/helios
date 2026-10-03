// Integration-test interposer, compiled separately and never linked into the helper.
#import <Metal/Metal.h>
#import <VideoToolbox/VideoToolbox.h>
#if defined(HELIOS_FAIL_DEVICE)
static id<MTLDevice> failDevice() { return nil; }
__attribute__((used)) static struct { const void* replacement; const void* replacee; } fault
__attribute__((section("__DATA,__interpose"))) = { (const void*)&failDevice, (const void*)&MTLCreateSystemDefaultDevice };
#elif defined(HELIOS_FAIL_ENCODER)
static OSStatus failEncoder(CFAllocatorRef, int32_t, int32_t, CMVideoCodecType,
    CFDictionaryRef, CFDictionaryRef, CFAllocatorRef, VTCompressionOutputCallback,
    void*, VTCompressionSessionRef* output) { *output = nullptr; return kVTCouldNotFindVideoEncoderErr; }
__attribute__((used)) static struct { const void* replacement; const void* replacee; } fault
__attribute__((section("__DATA,__interpose"))) = { (const void*)&failEncoder, (const void*)&VTCompressionSessionCreate };
#elif defined(HELIOS_FAIL_BITRATE)
static OSStatus changedBitrate(VTSessionRef session, CFStringRef key, CFAllocatorRef allocator, CFTypeRef* output) {
    if (CFEqual(key, kVTCompressionPropertyKey_AverageBitRate)) {
        int64_t changed = 1;
        *output = CFNumberCreate(allocator, kCFNumberSInt64Type, &changed);
        return noErr;
    }
    return VTSessionCopyProperty(session, key, allocator, output);
}
__attribute__((used)) static struct { const void* replacement; const void* replacee; } fault
__attribute__((section("__DATA,__interpose"))) = { (const void*)&changedBitrate, (const void*)&VTSessionCopyProperty };
#else
#error "Select exactly one task-owned initialization fault"
#endif
