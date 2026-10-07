# Grim Almanac

HUD บอกวัน เวลา และอากาศ สไตล์ดาร์กแฟนตาซี (ดำ–แดง) สำหรับ Foundry VTT V14 พร้อมฉาก Short Rest / Long Rest แบบอนิเมชั่น ใช้ได้กับทุกแคมเปญ: ปฏิทิน Harptos มาในตัว และแก้ชื่อเดือน เทศกาล ยุค ได้เอง

## ติดตั้ง

1. สร้าง repo บน GitHub แล้วอัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ (รวม `.github/`)
2. สร้าง tag เช่น `v0.1.0` แล้ว push — GitHub Actions จะสร้าง release พร้อม `module.json` และ `grim-almanac.zip` ให้เอง (เวอร์ชันและ URL ถูกเติมจาก tag และชื่อ repo อัตโนมัติ)
3. ใน Foundry: Install Module → วาง Manifest URL
   `https://github.com/<user>/<repo>/releases/latest/download/module.json`

## ใช้งาน

**ทุกคนเห็น**
- วันที่ เดือน ฤดู ปี + ยุค
- เวลา และช่วงของวัน (Dawn, Morning, Noon, Afternoon, Dusk, Evening, Night, Midnight, Dead of night)
- หน้าปัดกลางวัน/กลางคืนที่หมุนตามเวลา
- อุณหภูมิ สภาพอากาศ และข้างขึ้นข้างแรม
- ลากเพื่อย้ายตำแหน่ง ดับเบิลคลิกเพื่อกลับไปด้านบน
- ขนาด, นาฬิกา 12/24 ชม., °C/°F ตั้งได้รายคนที่ Configure Settings → Grim Almanac

**เฉพาะ GM** (แถวปุ่มใต้ HUD)
- `−10m` `+10m` `+1h` เดินเวลา
- `Short rest` เวลาผ่าน 1 ชม. และสั่ง short rest ให้ตัวละครที่เลือก
- `Long rest` เลือกจำนวนชั่วโมง แล้วสั่ง long rest ให้ตัวละครที่เลือก
- ⚙ ตั้งวันเวลา อากาศ ดวงจันทร์ และปฏิทิน

ตอนพัก ทุกจอจะเฟดดำ หน้าปัดลอยขึ้นมากลางจอและหมุนไปตามเวลาที่ผ่าน

## เวลาเดินยังไง

- ปุ่มเดินเวลาและการพักจะขยับ world time ของ Foundry จริง ระยะเวลา effect จึงนับถอยหลังตาม
- "Set date and time" แค่เปลี่ยนป้ายวันที่ของปัจจุบัน ไม่ขยับ world time จึงไม่ทำให้ effect หมดอายุ

## Macro API

```js
const almanac = game.modules.get("grim-almanac").api;
almanac.rest("long", 8);          // long rest 8 ชม. ให้ PC ทุกตัว
almanac.rest("short");
almanac.advanceTime(1800);        // +30 นาที
almanac.setDateTime({ year: 1492, monthIndex: 0, day: 24, hour: 12, minute: 0 });
almanac.getDate();
```

## เปลี่ยนภาพทีหลัง

ภาพทั้งหมดเป็น SVG ที่สร้างใน `scripts/art.js` (กรอบ HUD, หน้าปัด, กองไฟ, มือพันแผล) สีและฟอนต์อยู่ต้นไฟล์ `styles/grim-almanac.css`

## License

โค้ด: MIT ฟอนต์ Grenze และ Cinzel: SIL Open Font License 1.1 (ดูใน `fonts/`)
