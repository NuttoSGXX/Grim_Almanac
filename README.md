# Grim Almanac

HUD บอกวัน เวลา และอากาศ สไตล์ดาร์กแฟนตาซี สำหรับ Foundry VTT V14 มี 4 ธีมสีบนเทมเพลตเดียวกัน พร้อมฉาก Short Rest / Long Rest แบบอนิเมชั่น ใช้ได้กับทุกแคมเปญ: ปฏิทิน Harptos มาในตัว และแก้ชื่อเดือน เทศกาล ยุค ได้เอง

## ติดตั้ง

ใน Foundry: Install Module → วาง Manifest URL

```
https://github.com/NuttoSGXX/Grim_Almanac/releases/latest/download/module.json
```

## ปล่อยเวอร์ชันใหม่

1. แก้โค้ดแล้ว push ขึ้น `main`
2. สร้าง tag เช่น `v0.1.1` แล้ว push — GitHub Actions จะสร้าง release พร้อม `module.json` และ `module.zip` ให้เอง (เวอร์ชันและ URL ถูกเติมจาก tag อัตโนมัติ)

ถ้าอัปโหลดเองด้วยมือ: tag ต้องตรงกับ `version` ใน `module.json` และแนบไฟล์ชื่อ `module.json` กับ `module.zip`

## ใช้งาน

**ทุกคนเห็น**
- วันที่ เดือน ฤดู ปี + ยุค
- เวลา และช่วงของวัน (Dawn, Morning, Noon, Afternoon, Dusk, Evening, Night, Midnight, Dead of night)
- หน้าปัดกลางวัน/กลางคืนที่หมุนตามเวลา (กลับทิศได้ที่ Configure Settings → Grim Almanac → Turn the dial the other way)
- เส้นขอบสีของทั้ง HUD สะท้อนแสงแบบโลหะ: แถบแสงกวาดผ่านทุกเส้นพร้อมกันเป็นระยะ
- อุณหภูมิ สภาพอากาศ และข้างขึ้นข้างแรม
- ลากเพื่อย้ายตำแหน่ง ดับเบิลคลิกเพื่อกลับไปด้านบน
- ขนาด, นาฬิกา 12/24 ชม., °C/°F ตั้งได้รายคนที่ Configure Settings → Grim Almanac

**เฉพาะ GM** (แถวปุ่มใต้ HUD)
- `−10m` `+10m` `+1h` เดินเวลา
- `Short rest` เวลาผ่าน 1 ชม. และสั่ง short rest ให้ตัวละครที่เลือก
- `Long rest` เลือกจำนวนชั่วโมง แล้วสั่ง long rest ให้ตัวละครที่เลือก
- ⚙ ตั้งวันเวลา อากาศ ดวงจันทร์ ปฏิทิน และธีมสี

ตอนพัก ทุกจอจะเฟดดำ หน้าปัดลอยขึ้นมากลางจอและหมุนไปตามเวลาที่ผ่าน

## ธีมสี

GM เลือกได้ที่ ⚙ → Date and time → Display → Colour theme (หรือ Configure Settings → Grim Almanac) ถ้าเปิดใช้ Grim Core ให้เลือกที่ Grim Core แทน ธีมมีผลกับ HUD ฉากพัก และหน้าตั้งค่า ของทุกคนในโลกนั้น

| ธีม | สี |
| --- | --- |
| Crimson | ดำ–แดง (ค่าเริ่มต้น) |
| Ash | ดำ–เทา–ขาว |
| Amethyst | ขาว–ม่วง |
| Sapphire | ดำ–น้ำเงิน |

ทุกธีมใช้ token `--ga-*` ชุดเดียวกันที่ต้นไฟล์ `styles/grim-almanac.css` จะแก้เฉดหรือเพิ่มธีมใหม่ก็แก้ที่บล็อกนั้น (ถ้าเพิ่มธีม ให้เพิ่มชื่อใน `THEMES` ที่ `scripts/state.js` และ `Theme.*` ใน `lang/en.json` ด้วย)

## ใช้ร่วมกับ Grim Core

[Grim Core](https://github.com/NuttoSGXX/Grim_Core) คือแผงตั้งค่าธีมรวมของโมดูล Grim ทุกตัว ไม่จำเป็นต้องมี แต่ถ้าเปิดใช้ Grim Almanac จะทำงานแบบนี้

- ธีมสีของ Almanac ตาม Grim Core ทั้ง 4 ธีม (Abyss ของ Core คือ Sapphire ของ Almanac) และสีกำหนดเอง (Custom)
- ตัวเลือกธีมใน ⚙ ของ Almanac และใน Configure Settings จะถูกล็อก และมีปุ่ม **Open Grim Core** ให้ไปเปลี่ยนที่เดียว ธีมจึงไม่หลุดจากโมดูลอื่น
- ตอนลองเลือกธีมในแผง Grim Core HUD จะเปลี่ยนให้ดูทันทีก่อนกด Apply (เฉพาะ 4 ธีมสำเร็จรูป ส่วน Custom พื้นสว่าง/มืดจะตรงหลังกด Apply) ปิดแผงโดยไม่ Apply ก็กลับเป็นธีมเดิม
- ถ้าเอาติ๊ก Grim Almanac ออกจาก "Modules that follow" ใน Grim Core ตัวเลือกธีมของ Almanac จะกลับมาใช้ได้ตามปกติ

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

## Changelog

**0.1.3**
- ทำงานร่วมกับ Grim Core: ล็อกตัวเลือกธีมของ Almanac เมื่อ Grim Core เป็นคนคุมสี พร้อมปุ่มเปิด Grim Core
- HUD ตามธีมที่กำลังลองในแผง Grim Core ทันที (live preview)
- รับชื่อธีม `abyss` เป็นชื่อเดียวกับ `sapphire`
- `module.json` แนะนำ Grim Core (recommends)

**0.1.2**
- แก้ภาพกองไฟและมือพันแผลเป็นสีดำล้วนในธีม Crimson (ค่าสีอ้างอิงตัวเอง)
- กลับทิศการหมุนของหน้าปัด และเพิ่มตัวเลือก "Turn the dial the other way" ไว้สลับทิศได้เอง
- เปลี่ยนแสง glow จากจุดแสงวิ่ง เป็นแถบแสงสะท้อนแบบโลหะที่กวาดผ่านเส้นขอบทั้ง HUD

**0.1.1**
- หน้าปัดหมุนตามเข็มเสมอเมื่อเวลาเดินหน้า (เดิมเลือกทางที่สั้นกว่า เลยหมุนทวนเข็มเมื่อข้ามเวลาเกิน 12 ชม.)
- เพิ่มแสง glow วิ่งบนเส้นขอบของกรอบ แผ่นเวลา และวงหน้าปัด
- เพิ่ม 4 ธีมสี: Crimson, Ash, Amethyst, Sapphire

**0.1.0**
- เวอร์ชันแรก: HUD วัน/เวลา/อากาศ/ดวงจันทร์, Short rest / Long rest, ปฏิทิน Harptos และปฏิทินกำหนดเอง

## License

โค้ด: MIT ฟอนต์ Grenze และ Cinzel: SIL Open Font License 1.1 (ดูใน `fonts/`)
