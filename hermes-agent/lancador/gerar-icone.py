# Gera icone.png (256x256) usado no Hermes.exe: caduceu dourado em fundo verde-petróleo.
from PIL import Image, ImageDraw, ImageFont

T = 1024
img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle((32, 32, T - 32, T - 32), radius=200, fill=(4, 28, 28, 255), outline=(233, 196, 106, 255), width=28)
fonte = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 760)
d.text((T / 2, T / 2 + 30), "☤", font=fonte, fill=(233, 196, 106, 255), anchor="mm")
img.resize((256, 256), Image.LANCZOS).save("winres/icone.png")
