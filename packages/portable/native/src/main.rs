use base64::Engine;

#[cfg(test)]
mod boundary_tests {
    use super::*;
    use std::io::Cursor;

    #[test]
    fn bounded_lines_admit_exact_limit_and_reject_overflow_before_consuming_it() {
        let mut input = Cursor::new(b"1234\nlast");
        assert_eq!(read_message(&mut input, 4).unwrap().as_deref(), Some("1234"));
        assert_eq!(read_message(&mut input, 4).unwrap().as_deref(), Some("last"));
        assert!(read_message(&mut input, 4).unwrap().is_none());
        assert!(read_message(&mut Cursor::new(b"12345\n"), 4).is_err());
        assert!(read_message(&mut Cursor::new([255, 10]), 4).is_err());
    }

    #[test]
    fn direct_native_messages_enforce_path_matrix_and_resource_bounds() {
        let make = |commands| serde_json::from_value::<Frame>(serde_json::json!({"background":[0,0,0,1],"commands":commands})).unwrap();
        let valid = serde_json::json!({"op":"circle","args":[8,8,4],"matrix":[2,0,0,1,0,0],"color":[1,0,0,1]});
        assert!(validate_frame(&make(vec![valid.clone()])).is_ok());
        assert!(validate_frame(&make(vec![serde_json::json!({"op":"circle","args":[8,8,-4],"matrix":[1,0,0,1,0,0]})])).is_err());
        assert!(validate_frame(&make(vec![serde_json::json!({"op":"circle","args":[8,8,4]})])).is_err());
        assert!(validate_frame(&make(vec![valid; 120001])).is_err());
        assert!(validate_frame(&make(vec![serde_json::json!({"op":"save"}); 65])).is_err());
        assert!(validate_frame(&make(vec![serde_json::json!({"op":"restore"})])).is_err());
        assert!(validate_frame(&make(vec![serde_json::json!({"op":"text","args":[0,0],"text":"x".repeat(20001),"font":"pinned","size":12})])).is_err());
    }
}
use skia_safe::{
    Color4f, ColorType, Font, FontMgr, Matrix, Paint, Point, Rect, Typeface,
    gpu::{self, SurfaceOrigin, mtl},
};
use std::{
    collections::HashMap,
    ffi::{CString, c_void},
    io::{self, BufRead, Write},
};

unsafe extern "C" {
    fn helios_create(
        width: u32,
        height: u32,
        fps_num: u32,
        fps_den: u32,
        bitrate: u32,
        gop: u32,
        encoder_pool: u32,
        path: *const i8,
        hardware: bool,
        trace: *const i8,
        capture: *const i8,
    ) -> *mut c_void;
    fn helios_device(ctx: *mut c_void) -> *mut c_void;
    fn helios_queue(ctx: *mut c_void) -> *mut c_void;
    fn helios_texture(ctx: *mut c_void) -> *mut c_void;
    fn helios_encode(ctx: *mut c_void, index: u32) -> bool;
    fn helios_finish(ctx: *mut c_void, count: u32) -> bool;
    fn helios_reference(ctx: *mut c_void, index: u32) -> bool;
    fn helios_hardware(ctx: *mut c_void) -> bool;
    fn helios_raster_submitted(ctx: *mut c_void, index: u32);
    fn helios_close(ctx: *mut c_void) -> bool;
}

struct Native(*mut c_void);
impl Drop for Native {
    fn drop(&mut self) {
        unsafe {
            helios_close(self.0);
        }
    }
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct Command {
    op: String,
    #[serde(default)]
    args: Vec<f32>,
    color: Option<[f32; 4]>,
    text: Option<String>,
    font: Option<String>,
    size: Option<f32>,
    matrix: Option<[f32; 6]>,
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct Frame {
    background: [f32; 4],
    commands: Vec<Command>,
}
const FRAME_BYTES: usize = 32 * 1024 * 1024;
const FONT_HEADER_BYTES: usize = 48 * 1024 * 1024;

fn read_message<R: BufRead>(input: &mut R, limit: usize) -> Result<Option<String>, Box<dyn std::error::Error>> {
    let mut line = Vec::new();
    loop {
        let chunk = input.fill_buf()?;
        if chunk.is_empty() {
            return if line.is_empty() { Ok(None) } else { Ok(Some(String::from_utf8(line)?)) };
        }
        let end = chunk.iter().position(|byte| *byte == b'\n');
        let count = end.unwrap_or(chunk.len());
        if count > limit.saturating_sub(line.len()) { return Err("GPU message budget exceeded".into()); }
        line.extend_from_slice(&chunk[..count]);
        input.consume(count + usize::from(end.is_some()));
        if end.is_some() { return Ok(Some(String::from_utf8(line)?)); }
    }
}

fn validate_frame(frame: &Frame) -> Result<(), Box<dyn std::error::Error>> {
    let bounded = |value: f32| value.is_finite() && value.abs() <= 1e7;
    let valid_color = |color: &[f32; 4]| color.iter().all(|v| v.is_finite() && (0.0..=1.0).contains(v));
    if frame.commands.len() > 120000 || !valid_color(&frame.background) || frame.background[3] != 1.0 { return Err("GPU frame budget or background invalid".into()); }
    let mut depth = 0_usize;
    let mut characters = 0;
    for command in &frame.commands {
        if command.args.len() > 4 || command.args.iter().any(|v| !bounded(*v)) || command.color.as_ref().is_some_and(|color| !valid_color(color)) || command.matrix.as_ref().is_some_and(|matrix| matrix.iter().any(|v| !bounded(*v))) { return Err("invalid native coordinate or color".into()); }
        match (command.op.as_str(), command.args.as_slice()) {
            ("circle", &[_, _, r]) if r >= 0.0 && command.matrix.is_some() => {},
            ("rect", &[_, _, w, h]) if w >= 0.0 && h >= 0.0 => {},
            ("text", &[_, _]) => {
                let text = command.text.as_ref().ok_or("missing text")?;
                characters += text.encode_utf16().count();
                if characters > 20000 || !command.size.is_some_and(|size| size.is_finite() && size > 0.0 && size <= 4096.0) || command.font.as_ref().is_none_or(|font| font.is_empty()) { return Err("GPU text budget or font invalid".into()); }
            },
            ("save", &[]) if depth < 64 => { depth += 1; },
            ("restore", &[]) if depth > 0 => { depth -= 1; },
            ("translate" | "scale", &[_, _]) | ("rotate", &[_]) => {},
            _ => return Err("unsupported native command or GPU stack budget".into()),
        }
        if command.op != "circle" && command.matrix.is_some() { return Err("matrix belongs to circle commands only".into()); }
    }
    Ok(())
}
type GlyphRun = (Vec<u16>, Vec<Point>);
struct Fonts {
    bytes: HashMap<String, Vec<u8>>,
    faces: HashMap<String, Typeface>,
    runs: HashMap<(String, String, u32), GlyphRun>,
}
impl Fonts {
    fn new(message: &serde_json::Value) -> Result<Self, Box<dyn std::error::Error>> {
        // macOS binaries use CoreText rather than FreeType. Only makeFromData is
        // called: no family lookup, system fallback or system font enumeration.
        let manager = FontMgr::new();
        let mut fonts = Self {
            bytes: HashMap::new(),
            faces: HashMap::new(),
            runs: HashMap::new(),
        };
        let mut total = 0;
        for (name, value) in message["fonts"]
            .as_object()
            .ok_or("first message must contain fonts")?
        {
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(value.as_str().ok_or("invalid font bytes")?)?;
            total += bytes.len();
            if total > 32 * 1024 * 1024 { return Err("GPU font budget exceeded".into()); }
            let face = manager
                .new_from_data(&bytes, None)
                .ok_or("invalid pinned font")?;
            fonts.faces.insert(name.clone(), face);
            fonts.bytes.insert(name.clone(), bytes);
        }
        Ok(fonts)
    }
    fn draw(
        &mut self,
        canvas: &skia_safe::Canvas,
        command: &Command,
        paint: &Paint,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let name = command.font.as_ref().ok_or("missing font")?;
        let text = command.text.as_ref().ok_or("missing text")?;
        let size = command.size.ok_or("missing font size")?;
        if !size.is_finite() || size <= 0.0 || size > 2048.0 {
            return Err("invalid font size".into());
        }
        let key = (name.clone(), text.clone(), size.to_bits());
        if !self.runs.contains_key(&key) {
            if self.runs.len() >= 20_000 {
                self.runs.clear();
            }
            let face = rustybuzz::Face::from_slice(self.bytes.get(name).ok_or("unknown font")?, 0)
                .ok_or("invalid shaping font")?;
            let mut buffer = rustybuzz::UnicodeBuffer::new();
            buffer.push_str(text);
            buffer.guess_segment_properties();
            let shaped = rustybuzz::shape(&face, &[], buffer);
            let scale = size / face.units_per_em() as f32;
            let mut x = 0.0;
            let mut y = 0.0;
            let mut glyphs = Vec::new();
            let mut positions = Vec::new();
            for (glyph, position) in shaped.glyph_infos().iter().zip(shaped.glyph_positions()) {
                glyphs.push(glyph.glyph_id.try_into()?);
                positions.push(Point::new(
                    x + position.x_offset as f32 * scale,
                    y - position.y_offset as f32 * scale,
                ));
                x += position.x_advance as f32 * scale;
                y -= position.y_advance as f32 * scale;
            }
            self.runs.insert(key.clone(), (glyphs, positions));
        }
        let (glyphs, positions) = self.runs.get(&key).unwrap();
        let mut font = Font::new(self.faces.get(name).ok_or("unknown font")?.clone(), size);
        font.set_subpixel(true);
        font.set_edging(skia_safe::font::Edging::AntiAlias);
        canvas.draw_glyphs_at(
            glyphs,
            positions.as_slice(),
            (command.args[0], command.args[1]),
            &font,
            paint,
        );
        Ok(())
    }
}

fn draw_frame(
    canvas: &skia_safe::Canvas,
    frame: Frame,
    fonts: &mut Fonts,
) -> Result<(), Box<dyn std::error::Error>> {
    validate_frame(&frame)?;
    canvas.restore_to_count(1);
    canvas.reset_matrix();
    let [r, g, b, a] = frame.background;
    if a != 1.0 {
        return Err("GPU delivery background must be opaque".into());
    }
    canvas.clear(Color4f::new(r, g, b, a));
    for command in frame.commands {
        if command.args.iter().any(|v| !v.is_finite()) {
            return Err("non-finite coordinate".into());
        }
        let mut paint = Paint::default();
        paint.set_anti_alias(true);
        if let Some([r, g, b, a]) = command.color {
            paint.set_color4f(Color4f::new(r, g, b, a), None);
        }
        match (command.op.as_str(), command.args.as_slice()) {
            ("rect", &[x, y, w, h]) => {
                canvas.draw_rect(Rect::from_xywh(x, y, w, h), &paint);
            }
            ("circle", &[x, y, radius]) => {
                let [a, b, c, d, e, f] = command.matrix.ok_or("missing circle matrix")?;
                canvas.save();
                canvas.reset_matrix();
                canvas.concat(&Matrix::new_all(a, c, e, b, d, f, 0.0, 0.0, 1.0));
                canvas.draw_circle((x, y), radius, &paint);
                canvas.restore();
            }
            ("text", &[_, _]) => fonts.draw(canvas, &command, &paint)?,
            ("save", &[]) => {
                canvas.save();
            }
            ("restore", &[]) => {
                if canvas.save_count() <= 1 {
                    return Err("unbalanced restore".into());
                }
                canvas.restore();
            }
            ("translate", &[x, y]) => {
                canvas.translate((x, y));
            }
            ("scale", &[x, y]) => {
                canvas.scale((x, y));
            }
            ("rotate", &[radians]) => {
                canvas.rotate(radians.to_degrees(), None);
            }
            _ => return Err("unsupported native command".into()),
        }
    }
    Ok(())
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let probe = args.get(1).map(String::as_str) == Some("probe");
    let raster = args.get(1).map(String::as_str) == Some("raster");
    let reference = args.get(1).map(String::as_str) == Some("reference");
    if !probe && !raster && !reference && args.get(1).map(String::as_str) != Some("encode") {
        return Err("unsupported native mode".into());
    }
    let (width, height, num, den, bitrate, path) = if probe {
        (64, 64, 30, 1, 1_000_000, CString::new("")?)
    } else {
        if args.len() < 8 || args.len() > 12 {
            return Err("usage: helios-gpu encode|raster WIDTH HEIGHT FPS_NUM FPS_DEN BITRATE H264_PATH [TRACE_JSONL] [CAPTURE_GPUTRACE] [GOP] [ENCODER_POOL]".into());
        }
        (
            args[2].parse()?,
            args[3].parse()?,
            args[4].parse()?,
            args[5].parse()?,
            args[6].parse()?,
            CString::new(args[7].as_bytes())?,
        )
    };
    let gop: u32 = args.get(10).map(|value| value.parse().map_err(|_| "GOP must be an integer")).transpose()?.unwrap_or(90);
    if !(1..=300).contains(&gop) || !(100_000..=200_000_000).contains(&bitrate) { return Err("invalid native GPU bitrate or GOP".into()); }
    let encoder_pool: u32 = args.get(11).map(|value| value.parse().map_err(|_| "encoder pool must be an integer")).transpose()?.unwrap_or(1);
    if encoder_pool != 1 && encoder_pool != 3 { return Err("unsupported encoder pool; expected1 or3".into()); }
    if width == 0
        || height == 0
        || width % 2 != 0
        || height % 2 != 0
        || width > 4096
        || height > 4096
        || num == 0
        || den == 0
    {
        return Err("unsupported GPU dimensions or cadence".into());
    }
    let trace = CString::new(args.get(8).map(String::as_str).unwrap_or(""))?;
    let capture = CString::new(args.get(9).map(String::as_str).unwrap_or(""))?;
    let empty = CString::new("")?;
    let native = Native(unsafe {
        helios_create(
            width,
            height,
            num,
            den,
            bitrate,
            gop,
            encoder_pool,
            if reference {
                empty.as_ptr()
            } else {
                path.as_ptr()
            },
            !raster,
            trace.as_ptr(),
            capture.as_ptr(),
        )
    });
    if native.0.is_null() {
        return Err("GPU_INIT_FAILED: Metal/VideoToolbox hardware initialization failed".into());
    }
    let backend =
        unsafe { mtl::BackendContext::new(helios_device(native.0), helios_queue(native.0)) };
    let mut context = gpu::direct_contexts::make_metal(&backend, None).ok_or("SKIA_INIT_FAILED")?;
    let texture = unsafe { mtl::TextureInfo::new(helios_texture(native.0)) };
    let target = gpu::backend_render_targets::make_mtl((width as i32, height as i32), &texture);
    let mut surface = gpu::surfaces::wrap_backend_render_target(
        &mut context,
        &target,
        SurfaceOrigin::TopLeft,
        ColorType::RGBA8888,
        skia_safe::ColorSpace::new_srgb(),
        None,
    )
    .ok_or("GPU_SURFACE_FAILED")?;
    if probe {
        println!(
            "{}",
            serde_json::json!({"protocol":3,"gop":gop,"encoderPool":encoder_pool,"rasterizer":"skia-metal", "encoder":"videotoolbox", "hardwareRequired":true, "hardwareUsed": unsafe {helios_hardware(native.0)}, "surface":"iosurface-nv12", "zeroCopyProved":false})
        );
        return Ok(());
    }
    let mut input = io::stdin().lock();
    let header: serde_json::Value = serde_json::from_str(&read_message(&mut input, FONT_HEADER_BYTES)?.ok_or("missing font header")?)?;
    let mut fonts = Fonts::new(&header)?;
    let mut count = 0;
    let mut raw = vec![
        0_u8;
        if raster {
            width as usize * height as usize * 4
        } else {
            0
        }
    ];
    let mut stdout = io::stdout().lock();
    while let Some(line) = read_message(&mut input, FRAME_BYTES)? {
        let message: serde_json::Value = serde_json::from_str(&line)?;
        if let Some(svg) = message["svg"].as_str() {
            let dom = skia_safe::svg::Dom::from_bytes(svg.as_bytes(), FontMgr::empty())
                .map_err(|_| "invalid SVG")?;
            surface.canvas().clear(skia_safe::Color::TRANSPARENT);
            dom.render(surface.canvas());
        } else {
            draw_frame(
                surface.canvas(),
                serde_json::from_value(message)?,
                &mut fonts,
            )?;
        }
        context.flush(None);
        if !context.submit(None) {
            return Err("GPU_SUBMIT_FAILED".into());
        }
        unsafe {
            helios_raster_submitted(native.0, count);
        }
        if raster {
            let info = skia_safe::ImageInfo::new(
                (width as i32, height as i32),
                ColorType::RGBA8888,
                skia_safe::AlphaType::Unpremul,
                skia_safe::ColorSpace::new_srgb(),
            );
            if !surface.read_pixels(&info, &mut raw, width as usize * 4, (0, 0)) {
                return Err("GPU_READBACK_FAILED".into());
            }
            stdout.write_all(&raw)?;
        } else if reference {
            if !unsafe { helios_reference(native.0, count) } {
                return Err("GPU_REFERENCE_FAILED".into());
            }
        } else if !unsafe { helios_encode(native.0, count) } {
            return Err("GPU_ENCODE_FAILED".into());
        }
        count += 1;
    }
    if !raster && !reference && !unsafe { helios_finish(native.0, count) } { return Err("GPU_ENCODER_DRAIN_FAILED".into()); }
    let readback = if reference {
        width as u64 * height as u64 * 3 / 2
    } else {
        raw.len() as u64
    };
    let receipt = serde_json::json!({"protocol":3,"gop":gop,"encoderPool":encoder_pool,"frames":count,"rasterizer":"skia-metal","encoder":if raster || reference {"none"} else {"videotoolbox"},"explicitRawReadbackBytes":readback * count as u64,"zeroCopyProved":false});
    if raster || reference {
        eprintln!("{receipt}");
    } else {
        writeln!(stdout, "{receipt}")?;
    }
    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
