#include "../encoder-flight.hpp"
#include <cassert>

int main() {
    // A synchronous callback can finish before submit returns.
    HeliosEncoderFlight synchronous(3);
    assert(synchronous.begin(0, 10));
    assert(synchronous.complete(0, true));
    assert(synchronous.finish(1));

    // Delayed callbacks cannot grow the live set past the fixed capacity.
    HeliosEncoderFlight delayed(3);
    assert(delayed.begin(0, 10));
    assert(delayed.begin(1, 11));
    assert(delayed.begin(2, 12));
    assert(delayed.live() == 3 && delayed.peak() == 3);
    assert(delayed.oldest().value() == 0);
    assert(!delayed.finish(3));
    assert(delayed.complete(0, true));
    assert(delayed.begin(3, 10));
    assert(delayed.complete(1, true));
    assert(delayed.complete(2, true));
    assert(delayed.complete(3, true));
    assert(delayed.finish(4));

    HeliosEncoderFlight pressure(3);
    assert(pressure.begin(0, 10)); assert(pressure.begin(1, 11)); assert(pressure.begin(2, 12));
    assert(!pressure.begin(3, 13)); assert(!pressure.finish(4));

    HeliosEncoderFlight alias(3);
    assert(alias.begin(0, 10)); assert(!alias.begin(1, 10));

    HeliosEncoderFlight sequence(3);
    assert(!sequence.begin(1, 10));

    HeliosEncoderFlight serialPressure(1);
    assert(serialPressure.begin(0, 10)); assert(!serialPressure.begin(1, 11));

    for (int fault = 0; fault < 4; ++fault) {
        HeliosEncoderFlight broken(3);
        assert(broken.begin(0, 10)); assert(broken.begin(1, 11));
        if (fault == 0) assert(!broken.complete(1, true)); // Out of order.
        if (fault == 1) assert(!broken.complete(7, true)); // Unknown ticket.
        if (fault == 2) { assert(broken.complete(0, true)); assert(!broken.complete(0, true)); } // Duplicate.
        if (fault == 3) assert(!broken.complete(0, false)); // Dropped/error frame.
        assert(!broken.finish(2));
        assert(!broken.begin(2, 12));
    }

    HeliosEncoderFlight serial(1);
    for (unsigned frame = 0; frame < 300; ++frame) { assert(serial.begin(frame, 10)); assert(serial.complete(frame, true)); }
    assert(serial.peak() == 1 && serial.finish(300));
}
