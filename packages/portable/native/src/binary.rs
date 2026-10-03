use std::io::BufRead;

const MAX_BYTES: usize = 32 * 1024 * 1024;
type Result<T> = std::result::Result<T, &'static str>;

pub enum Command<'a> {
    Rect([f32; 4], [f32; 4]),
    Circle([f32; 3], [f32; 6], [f32; 4]),
    Translate([f32; 2]),
    Scale([f32; 2]),
    Rotate(f32),
    Save,
    Restore,
    Text { position: [f32; 2], size: f32, color: [f32; 4], font: &'a str, text: &'a str },
}

fn word(bytes: &[u8], index: usize) -> u32 { u32::from_le_bytes(bytes[index..index + 4].try_into().unwrap()) }
fn color(value: &[f32; 4]) -> bool { value.iter().all(|v| v.is_finite() && (0.0..=1.0).contains(v)) }

pub fn header(bytes: &[u8]) -> Result<()> {
    if bytes.len() < 32 || word(bytes, 0) != 0x35464748 || word(bytes, 4) as usize != bytes.len() || bytes.len() > MAX_BYTES || bytes.len() % 4 != 0 || word(bytes, 8) > 120000 || word(bytes, 12) != 0 {
        return Err("invalid binary frame header or budget");
    }
    let background = background(bytes);
    if !color(&background) || background[3] != 1.0 { return Err("invalid binary background"); }
    Ok(())
}

pub fn background(bytes: &[u8]) -> [f32; 4] { std::array::from_fn(|i| f32::from_bits(word(bytes, 16 + i * 4))) }

/** Checks the declared envelope before allocating the reusable payload buffer. */
pub fn read<R: BufRead>(input: &mut R, bytes: &mut Vec<u8>) -> std::result::Result<bool, Box<dyn std::error::Error>> {
    if input.fill_buf()?.is_empty() { return Ok(false); }
    let mut prefix = [0_u8; 32]; input.read_exact(&mut prefix)?;
    let length = word(&prefix, 4) as usize;
    if word(&prefix, 0) != 0x35464748 || !(32..=MAX_BYTES).contains(&length) || length % 4 != 0 || word(&prefix, 8) > 120000 || word(&prefix, 12) != 0 { return Err("invalid binary frame header or budget".into()); }
    bytes.clear(); bytes.extend_from_slice(&prefix); bytes.resize(length, 0);
    input.read_exact(&mut bytes[32..])?; header(bytes)?; Ok(true)
}

pub struct Commands<'a> { bytes: &'a [u8], offset: usize, remaining: u32 }
impl<'a> Commands<'a> {
    pub fn new(bytes: &'a [u8]) -> Self { Self { bytes, offset: 32, remaining: word(bytes, 8) } }
    fn u32(&mut self) -> Result<u32> {
        if self.offset + 4 > self.bytes.len() { return Err("truncated binary command"); }
        let value = word(self.bytes, self.offset); self.offset += 4; Ok(value)
    }
    fn floats<const N: usize>(&mut self) -> Result<[f32; N]> {
        let mut values = [0.0; N];
        for value in &mut values { *value = f32::from_bits(self.u32()?); if !value.is_finite() || value.abs() > 1e7 { return Err("invalid binary coordinate"); } }
        Ok(values)
    }
    fn color(&mut self) -> Result<[f32; 4]> { let value = self.floats()?; if !color(&value) { return Err("invalid binary color"); } Ok(value) }
    fn string(&mut self, length: u32) -> Result<&'a str> {
        let length = length as usize;
        let padded = length.checked_add(3).ok_or("binary string overflow")? & !3;
        let end = self.offset.checked_add(padded).ok_or("binary string overflow")?;
        if end > self.bytes.len() { return Err("truncated binary string"); }
        let text = std::str::from_utf8(&self.bytes[self.offset..self.offset + length]).map_err(|_| "invalid binary UTF-8")?;
        if self.bytes[self.offset + length..end].iter().any(|byte| *byte != 0) { return Err("invalid binary string padding"); }
        self.offset = end; Ok(text)
    }
    pub fn next(&mut self) -> Result<Option<Command<'a>>> {
        if self.remaining == 0 {
            if self.offset != self.bytes.len() { return Err("trailing binary commands"); }
            return Ok(None);
        }
        self.remaining -= 1;
        Ok(Some(match self.u32()? {
            1 => { let rect = self.floats()?; if rect[2] < 0.0 || rect[3] < 0.0 { return Err("negative binary rectangle"); } Command::Rect(rect, self.color()?) },
            2 => { let circle = self.floats()?; if circle[2] < 0.0 { return Err("negative binary circle"); } Command::Circle(circle, self.floats()?, self.color()?) },
            3 => Command::Translate(self.floats()?),
            4 => Command::Scale(self.floats()?),
            5 => Command::Rotate(self.floats::<1>()?[0]),
            6 => Command::Save,
            7 => Command::Restore,
            8 => {
                let [x, y, size] = self.floats()?;
                if size <= 0.0 || size > 2048.0 { return Err("invalid binary font size"); }
                let color = self.color()?; let font_length = self.u32()?; let text_length = self.u32()?;
                let font = self.string(font_length)?; let text = self.string(text_length)?;
                Command::Text { position: [x, y], size, color, font, text }
            },
            _ => return Err("unknown binary command"),
        }))
    }
}

pub fn validate(bytes: &[u8], font_exists: impl Fn(&str) -> bool) -> Result<()> {
    header(bytes)?;
    let mut commands = Commands::new(bytes); let mut depth = 0; let mut characters = 0;
    while let Some(command) = commands.next()? {
        match command {
            Command::Save if depth < 64 => depth += 1,
            Command::Save => return Err("binary stack budget"),
            Command::Restore if depth > 0 => depth -= 1,
            Command::Restore => return Err("unbalanced binary restore"),
            Command::Text { font, text, .. } => {
                characters += text.encode_utf16().count();
                if characters > 20000 || font.is_empty() || !font_exists(font) { return Err("binary text budget or unknown font"); }
            },
            _ => {},
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io;
    fn packet(words: &[u32]) -> Vec<u8> {
        let mut bytes = vec![0; 32]; let length = 32 + words.len() * 4;
        bytes[0..4].copy_from_slice(&0x35464748_u32.to_le_bytes()); bytes[4..8].copy_from_slice(&(length as u32).to_le_bytes());
        bytes[8..12].copy_from_slice(&1_u32.to_le_bytes()); bytes[28..32].copy_from_slice(&1_f32.to_le_bytes());
        for word in words { bytes.extend_from_slice(&word.to_le_bytes()); } bytes
    }
    #[test]
    fn bounded_reader_and_validation_reject_broken_envelopes() {
        let mut valid = packet(&[]); valid[8..12].fill(0);
        assert!(validate(&valid, |_| false).is_ok());
        assert!(validate(&packet(&[99]), |_| false).is_err());
        assert!(validate(&packet(&[7]), |_| false).is_err());
        assert!(validate(&packet(&[5, f32::NAN.to_bits()]), |_| false).is_err());
        let mut oversized = valid.clone(); oversized[4..8].copy_from_slice(&((MAX_BYTES + 4) as u32).to_le_bytes());
        let mut output = vec![]; assert!(read(&mut io::Cursor::new(oversized), &mut output).is_err()); assert!(output.is_empty());
        assert!(read(&mut io::Cursor::new(&valid[..31]), &mut output).is_err());
        assert!(read(&mut io::Cursor::new(&valid), &mut output).unwrap()); assert_eq!(output, valid);
        assert!(!read(&mut io::Cursor::new([]), &mut output).unwrap());
    }
    #[test]
    fn utf8_padding_and_known_font_are_independent_boundaries() {
        let mut text = packet(&[8, 0, 0, 12_f32.to_bits(), 0, 0, 0, 1_f32.to_bits(), 1, 1, b'f' as u32, b'x' as u32]);
        assert!(validate(&text, |font| font == "f").is_ok()); assert!(validate(&text, |_| false).is_err());
        text[72] = 255; assert!(validate(&text, |_| true).is_err()); text[72] = b'f'; text[73] = 1; assert!(validate(&text, |_| true).is_err());
    }
    #[test]
    fn command_geometry_paint_stack_count_and_text_are_bounded() {
        let one = 1_f32.to_bits();
        assert!(validate(&packet(&[1, 0, 0, one, one, 0, 0, 0, one]), |_| false).is_ok());
        assert!(validate(&packet(&[1, 0, 0, one, one, 2_f32.to_bits(), 0, 0, one]), |_| false).is_err());
        assert!(validate(&packet(&[3, 10_000_001_f32.to_bits(), 0]), |_| false).is_err());
        assert!(validate(&packet(&[2, 0, 0, (-1_f32).to_bits(), one, 0, 0, one, 0, 0, 0, 0, 0, one]), |_| false).is_err());
        let mut stack = packet(&[6; 65]); stack[8..12].copy_from_slice(&65_u32.to_le_bytes()); assert!(validate(&stack, |_| false).is_err());
        let mut count = packet(&[]); count[8..12].copy_from_slice(&120001_u32.to_le_bytes()); assert!(header(&count).is_err());
        let mut text = packet(&[8, 0, 0, 12_f32.to_bits(), 0, 0, 0, one, 1, 20001, b'f' as u32]);
        text.extend_from_slice(&vec![b'x'; 20001]); text.extend_from_slice(&[0; 3]);
        let length = text.len() as u32; text[4..8].copy_from_slice(&length.to_le_bytes()); assert!(validate(&text, |_| true).is_err());
    }
}
