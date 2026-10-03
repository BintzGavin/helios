#pragma once
#include <array>
#include <cstdint>
#include <limits>
#include <optional>

// All access is protected by State's callback mutex. Frame refcons are integer
// indices, not pointers to recyclable tickets. No ticket outlives State.
class HeliosEncoderFlight {
    struct Slot { bool live = false; uint32_t frame = 0, surface = 0; };
    std::array<Slot, 3> slots{};
    uint32_t capacity, submitted = 0, completed = 0, highWater = 0;
    bool failed = false;
public:
    explicit HeliosEncoderFlight(uint32_t size) : capacity(size) {}
    uint32_t live() const { uint32_t count = 0; for (const auto& slot : slots) count += slot.live; return count; }
    uint32_t peak() const { return highWater; }
    std::optional<uint32_t> oldest() const {
        std::optional<uint32_t> frame;
        for (const auto& slot : slots) if (slot.live && (!frame || slot.frame < *frame)) frame = slot.frame;
        return frame;
    }
    std::optional<uint32_t> surface(uint32_t frame) const {
        for (const auto& slot : slots) if (slot.live && slot.frame == frame) return slot.surface;
        return std::nullopt;
    }
    bool begin(uint32_t frame, uint32_t surface) {
        if (failed || (capacity != 1 && capacity != 3) || frame != submitted || submitted == std::numeric_limits<uint32_t>::max() || live() >= capacity) { failed = true; return false; }
        for (const auto& slot : slots) if (slot.live && slot.surface == surface) { failed = true; return false; }
        for (auto& slot : slots) if (!slot.live) {
            slot = { true, frame, surface }; ++submitted;
            if (live() > highWater) highWater = live();
            return true;
        }
        failed = true; return false;
    }
    bool complete(uint32_t frame, bool success) {
        for (auto& slot : slots) if (slot.live && slot.frame == frame) {
            slot.live = false;
            if (failed || frame != completed || !success) { failed = true; return false; }
            ++completed; return true;
        }
        failed = true; return false;
    }
    bool finish(uint32_t expected) const { return !failed && live() == 0 && submitted == expected && completed == expected; }
};
