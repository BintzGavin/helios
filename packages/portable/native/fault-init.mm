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
#else
#error "Select exactly one task-owned initialization fault"
#endif
