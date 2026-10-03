fn main() {
    println!("cargo:rerun-if-changed=metal.mm");
    cc::Build::new()
        .cpp(true)
        .file("metal.mm")
        .flag("-std=c++17")
        .flag("-fobjc-arc")
        .compile("helios_metal");
    for framework in [
        "Foundation",
        "Metal",
        "CoreVideo",
        "CoreMedia",
        "VideoToolbox",
        "IOSurface",
    ] {
        println!("cargo:rustc-link-lib=framework={framework}");
    }
}
