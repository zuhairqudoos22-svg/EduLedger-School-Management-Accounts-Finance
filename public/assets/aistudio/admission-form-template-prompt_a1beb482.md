# Google AI Studio (App Builder) Prompt — Student Admission & Registration Form Templates

Run this prompt inside your existing EduLedger project in Google AI Studio.
Attach: (1) `_School_Registration_Form.pdf` (the sample), (2) the school logo.

---

```
Act as a senior web-app and software developer. In my existing School Management & Accounts web app (EduLedger PWA; IndexedDB locally, Firebase Auth + Firestore sync on the free Spark plan), upgrade the module "Student Admission & Registration Form" so the user can SELECT a form template, and add the attached sample (THE HABITAT SCHOOL SYSTEM "Admission Form", A4 portrait) as a built-in template. STRICT RULES: do NOT change the existing design language, colours, fonts, sidebar, header, page layout, margins, or any other module or function. The current admission form, its fields and its saved student records must keep working exactly as before. Only ADD to this module, in the current UI style (same cards, buttons, tabs, modals, toasts, dark/light theme). Use only FREE technologies: no paid API, no API key, no paid library or service, no backend.

## 1. TEMPLATE SELECTOR (NEW, INSIDE THE EXISTING MODULE)
- At the top of the module add a compact "Form Template" selector (a dropdown or a thumbnail gallery with live mini-previews, same style as the rest of the app). Options: (1) "Standard Form" = the current existing form, unchanged and still the default; (2) "Habitat Admission Form (A4 Portrait)" = the new template recreated from the attached sample.
- The selected template controls (a) the printable/PDF layout and (b) the on-screen data-entry layout of the module, as described below. Switching templates never loses entered data (all templates read and write the same student record).
- Remember the last chosen template per user, and allow the Main Admin to set the school-wide default template in Settings. Build a template registry (for example admission-templates.js): { id, name, thumbnail, orientation: "portrait", size: "A4", palette, fonts, sections, fields, printLayout }, so more templates can be added later without changing the engine.

## 2. RECREATE THE ATTACHED SAMPLE FAITHFULLY (LIVE HTML/CSS, NOT A STATIC IMAGE)
Recreate the sample as an HTML/CSS template at exact A4 portrait size (210 x 297 mm, 794 x 1123 px at 96 dpi) with real, dynamic text fields. Keep the sample's structure and order:
1. Header: school logo at the top-left (square with its own green background), the school name in a two-tone bold sans-serif heading on two lines (first line in dark navy #111827, second line in green #3DB86B; split the name automatically into two lines, for example "THE HABITAT" / "SCHOOL SYSTEM", and auto-fit for any school name), below it "ADMISSION FORM" ("ADMISSION" in navy, "FORM" in green), a "Student Photo" box at the top-right, and "DATE OF REGISTRATION" with a dd / mm / yyyy boxed date at the right.
2. PERSONAL INFORMATION (section title, "PERSONAL" in green and "INFORMATION" in navy): Full Name, Father's Name, Guardian Name (full-width lines); Email and Nationality; Gender with Male / Female checkboxes and Domicile; Date of Birth as boxed dd / mm / yyyy and the admission "Start" field; Country and Religion; CNIC / B.Form and Phone.
3. UNDERTAKING: a short heading and the undertaking paragraph ("I hereby undertake to comply with all existing and future rules and regulations of the institute...").
4. NOTE: the fee-increase note ("A 10% increase in the student fee will be implemented every year in the month of November.") with the Father/Guardian Signature line beside it.
5. ADDRESS: Present Address (two lines), Occupation, Education, Phone No 1, Income, Phone No 2.
6. Footer: SCHOOL ADDRESS (address and phone numbers), two signature lines (Father/Guardian Signature, Officer Signature), "THANK YOU FOR REGISTRATION", and DOCUMENTS REQUIRED (for example "One 4x4 Photo, Father's CNIC, Student's B.Form, previous class Result Card").
- Visual style from the sample: clean white page, thin light-grey bordered input boxes with rounded corners, small bold labels, green accent headings, serif font (Lora or Playfair Display) for the note, address and documents text, sans-serif (Montserrat or Inter) for headings and labels, free fonts from Google Fonts cached by the service worker.
- Dynamic school data: school name, logo, address, phone numbers, the undertaking text, the fee note, the documents-required list and the footer message come from Settings > School Profile (editable by the Main Admin, with the sample text as defaults when empty). Nothing school-specific is hard-coded. The fee note and the undertaking can each be switched on or off. If there is no logo, show a text-only header.
- The label "Start Time" in the sample is configurable (Settings): default "Admission Date", with alternatives such as "Session Start", "Start Date" or a custom label.

## 3. FIELDS AND DATA MODEL (EXTEND, DO NOT BREAK)
- Map every field to the student record. Existing fields (full name, father's name, gender, date of birth, CNIC/B-Form, phone, address, photo, etc.) keep their current storage. Add these as NEW OPTIONAL fields if they do not exist yet: guardianName, email, nationality, domicile, religion, country, startDate (or the configured start label value), occupation, education, monthlyIncome, phone2, registrationDate, undertakingAccepted, officerName (optional), plus formTemplateId. Missing fields in old records must be treated as empty, never as errors. Write a safe migration (IndexedDB version bump with onupgradeneeded, Firestore mapping updated) with no data loss, and update Backup/Restore so old backups still restore and new fields are included.
- Class and section are not on the printed sample, but the on-screen form must still let the user choose the class, section and admission number (existing behaviour). Show them in the data-entry view and add an optional toggle "Print class and section on the form" (default OFF so the printout matches the sample exactly).
- Validation: required fields (full name, father's name, gender, date of birth, a contact phone), CNIC/B-Form format (13 digits, accepts 12345-1234567-1 or digits only, auto-formatting while typing), phone format (Pakistani mobile 03XX-XXXXXXX, auto-formatting), email format, date of birth not in the future, age range warning for the selected class, income numeric and non-negative, duplicate check (same B-Form/CNIC or same name + father's name + date of birth) with a warning dialog.
- Student photo: upload or take with the device camera (free getUserMedia), crop to the 4x4 / passport ratio, compress on the client (about 300 x 300 px, JPEG/WebP quality about 0.75, 20-30 KB) and store as base64 inside the record (no Cloud Storage). Show it in the photo box of the form.

## 4. ON-SCREEN DATA-ENTRY VIEW FOR THE NEW TEMPLATE
- When the Habitat template is selected, show the entry form in the same grouped order as the sample (Personal Information, Undertaking, Address), using the app's existing input styles, in a responsive grid (2 columns on desktop, 1 on mobile) with a live paper-style preview panel beside it (or below it on small screens) that updates as the user types. Preview scales to fit the screen, with zoom controls.
- The Gender checkboxes, the boxed date inputs (dd / mm / yyyy with auto-advance between boxes) and the photo box should behave like the sample. Keyboard-friendly, with Tab order following the form.
- Buttons: "Save Admission", "Save and Print", "Download PDF", "Print Blank Form", "Clear". Show success and error toasts, and confirm before clearing unsaved data.

## 5. PRINT AND PDF OUTPUT (A4 PORTRAIT, FREE LIBRARIES ONLY)
- Three outputs: (a) PRINT BLANK FORM: the empty template for parents to fill by hand (all boxes empty, school details filled in), with an option to print several copies; (b) FILLED FORM: the template pre-filled from a saved student record (text printed in the boxes, photo in the photo box, registration date filled), for archiving or signing; (c) a PARTIAL form where the front-desk has typed only some fields and the rest stay blank.
- "Download PDF" with jsPDF + html2canvas (free CDN, pinned versions, render at 2x to 3x for sharp text) or the browser's print-to-PDF with @page { size: A4 portrait; margin: 0 } and print-color-adjust: exact. Wait for document.fonts.ready and for all images to load before capture. Avoid CSS features that html2canvas renders poorly (backdrop-filter, mix-blend-mode, complex filters). Target about 300 KB to 1 MB per PDF. File name like "Admission_Form_<Name>_<AdmissionNo>.pdf".
- The whole form must fit on ONE A4 page with the same proportions as the sample. Long values (long names, two-line addresses) must shrink to fit or wrap inside their boxes, never overflow or overlap neighbouring fields. Names and addresses support English and Urdu (RTL text with Noto Nastaliq Urdu or Noto Naskh Arabic loaded free from Google Fonts), and the field boxes grow or the font auto-fits instead of cutting text.
- Bulk option: "Print blank forms" (choose the number of copies) and "Print filled forms for selected students" as one merged PDF, generated in chunks so the browser stays responsive.

## 6. NO OVERLAP AND LAYOUT SAFETY
- Use a content layer and a decoration layer (decorative shapes, borders and the optional faint logo watermark sit behind the text, position: absolute, z-index: 0, pointer-events: none). Keep every section inside defined safe zones with at least 6 mm clear space between elements, page margins as in the sample, and signature lines never touching text. After render, run a collision check on element rectangles and, if anything would overlap, reduce font size within limits, then wrap, and show a visible warning in the preview rather than overlapping anything.
- No horizontal page scrolling in the module at any width (1920, 1440, 1280, 1024, 768, 390 px) and at 125% zoom; the preview container scrolls or scales on its own.

## 7. PERMISSIONS, AUDIT, LANGUAGE, OFFLINE
- Use the existing role/permission system: add "Admission: View / Add / Edit / Print Forms / Edit Templates". Enforce inside the functions, not only by hiding buttons. Only the Main Admin can change the school-wide default template and the school-profile texts.
- Write an audit-log entry (who, what, when) for creating, editing, printing and deleting admissions, and for printing blank form batches.
- Use the existing i18n system for UI text. Add an optional "bilingual labels" setting (English with Urdu labels under or beside each field) for the printed form, default OFF.
- Everything works offline after the first load (fonts, template assets and PDF libraries cached by the service worker with a bumped cache version), and syncs through the existing Firestore layer when online.
- Handle states: loading, empty, missing logo, missing photo (show the "Student Photo" placeholder like the sample), and unsaved-changes warnings.

## 8. TEST CHECKLIST (INCLUDE IN THE DELIVERABLE)
1. The template selector shows both templates; "Standard Form" behaves exactly as before and old student records open and save normally.
2. The Habitat template matches the attached sample's structure, spacing and style on A4 portrait, with school name, logo, address, phones, undertaking, fee note and documents list taken from Settings.
3. A blank form prints on one A4 page; a filled form shows the correct data and photo; a long name, a two-line address and an Urdu name do not overflow or overlap.
4. Saving a new admission stores the new optional fields; an old backup restores without errors; the new fields appear in the Backup export.
5. CNIC, phone, email and date validation, and the duplicate warning, all work.
6. PDF download opens as A4 portrait with fonts embedded and looks identical to the preview, also offline; printing from the browser matches.
7. A user without the Print permission cannot print or download; audit log entries appear.
8. No change to the rest of the app (design, header, sidebar, other modules, data).

## 9. DELIVERABLE
- Output the complete changed and added code split by file (template registry, the Habitat template, entry view, print/PDF engine, data-model migration, settings additions, service-worker update), list exactly which files and functions were changed, and give a short Change Report confirming that no existing design, layout, margins, feature or data was altered.
```

---

## Before you run it

- Take a **backup** first (the prompt adds new optional fields to the student record).
- Confirm what the sample's "Start Time" field means. The prompt defaults it to "Admission Date" and makes the label configurable.
- Check the school address and phone numbers in Settings > School Profile, because the form header and footer read them from there.

## If the AI Studio answer gets cut off (run in 3 steps)

Send the full prompt above first. If the output stops early, continue with these short follow-ups, one at a time:

**Step 2:**
```
Continue the same task. Give me the remaining code for sections 3 and 4 (data model migration, validation, photo handling, and the on-screen data-entry view with live preview). Do not repeat code you already gave, and do not change any existing design or feature.
```

**Step 3:**
```
Continue the same task. Give me the remaining code for sections 5, 6 and 7 (blank/filled/partial PDF and print engine, overlap protection, permissions, audit log, service-worker update). Then give the test results table and the final Change Report listing every changed file and function.
```

**Step 4 (visual check, if the layout differs from the sample):**
```
Compare the Habitat template with the attached sample and fix only the spacing, font sizes, box sizes and alignment so the printed A4 page matches the sample as closely as possible. Do not change any other module.
```

After the build, print one blank form and one filled form for 2 or 3 students, and check the single-page fit, the photo box and the date boxes. If something looks off, send me a screenshot and I'll write a targeted fix prompt.
