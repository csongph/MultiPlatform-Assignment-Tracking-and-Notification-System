--
-- PostgreSQL database dump
--


-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.alembic_version (version_num) VALUES ('0f9f537f2d5a');


--
-- Data for Name: platforms; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.platforms (id, name) VALUES (1, 'google_classroom');
INSERT INTO public.platforms (id, name) VALUES (2, 'microsoft_teams');
INSERT INTO public.platforms (id, name) VALUES (3, 'custom');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, email, password_hash, display_name, is_active, created_at, updated_at, password_reset_token, password_reset_expires_at) VALUES ('e27363ae-d793-41a8-89f9-6026f247c0bf', 'chayanggoon.s13@gmail.com', '$2b$12$a3KC36U05gXBArv5DXUum.jxsWIcyi7MT/WLJxdqUvUHHY08IsBey', 'Chayanggoon Songphim', true, '2026-07-22 10:40:32.127335+07', '2026-07-22 10:40:32.127335+07', NULL, NULL);
INSERT INTO public.users (id, email, password_hash, display_name, is_active, created_at, updated_at, password_reset_token, password_reset_expires_at) VALUES ('ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', '67030052@kmitl.ac.th', '$2b$12$xbEyWCy7R/jGB8BUSzMjg.G/n2dwinV3qRV5LUOAkxtdICo8BuMvu', 'Chayanggoon Songphim', true, '2026-07-22 13:01:34.436695+07', '2026-07-22 13:01:34.436695+07', NULL, NULL);
INSERT INTO public.users (id, email, password_hash, display_name, is_active, created_at, updated_at, password_reset_token, password_reset_expires_at) VALUES ('c9e9fb99-810e-4205-8937-6ad66757e1dc', '67030037@kmitl.ac.th', '$2b$12$T4s.qioucWOYxmCRNfjryeI22uhT.1iO.a25cyQxPB9obOGPC/lte', 'Reen', true, '2026-07-23 09:00:05.673708+07', '2026-07-23 09:00:05.673708+07', NULL, NULL);
INSERT INTO public.users (id, email, password_hash, display_name, is_active, created_at, updated_at, password_reset_token, password_reset_expires_at) VALUES ('a8fba782-0dc6-4c52-9a88-8436eee8d3df', 'admin@kmitl.ac.th', '$2b$12$tV0Aw23uaIC5hLJsw/FlNuxqRXr0pSlJIZkpvptvzpZlB0Z1YS7n.', 'System Administrator', true, '2026-08-03 12:22:55.173829+07', '2026-08-03 12:22:55.173829+07', NULL, NULL);
INSERT INTO public.users (id, email, password_hash, display_name, is_active, created_at, updated_at, password_reset_token, password_reset_expires_at) VALUES ('44753a57-ac4a-47fb-8d09-fcaac605a110', '67030338@kmitl.ac.th', '$2b$12$O0IhWRBVbHmyiKj1m4n1TOnY25SBDN/dLGx1LsVH2D2LgIyKvwN/q', 'Rattapum Sornkeaw', true, '2026-08-12 20:26:21.685566+07', '2026-08-12 20:26:21.685566+07', NULL, NULL);
INSERT INTO public.users (id, email, password_hash, display_name, is_active, created_at, updated_at, password_reset_token, password_reset_expires_at) VALUES ('612bed31-f86b-40b4-8ac0-4efe1234e8d6', '67030223@kmitl.ac.th', '$2b$12$UiPo0LygZdislIeSWJAf.ev18K1.aO0p7xHqnhcxJQ3OxdF1wSMca', 'Saranyapat', true, '2026-08-13 01:31:44.535569+07', '2026-08-13 01:31:44.535569+07', NULL, NULL);


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.courses (id, user_id, platform_id, external_course_id, name, is_deleted, course_code, instructor_name, description) VALUES ('1cdb5559-2c07-4ba8-a246-7c983b7fe7c3', 'e27363ae-d793-41a8-89f9-6026f247c0bf', 1, '848330842820', 'ระบบศูนย์กลางการเรียนรู้ LMS PORTAL', false, NULL, NULL, NULL);
INSERT INTO public.courses (id, user_id, platform_id, external_course_id, name, is_deleted, course_code, instructor_name, description) VALUES ('5c589519-69cc-4985-a593-ac2c5aa857a8', 'ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 1, '868893388409', '2569-IPL', false, NULL, NULL, NULL);
INSERT INTO public.courses (id, user_id, platform_id, external_course_id, name, is_deleted, course_code, instructor_name, description) VALUES ('3b270e5f-2b48-4f11-b8bd-4f92ec56ed28', 'ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 1, '841462031915', 'SENSORS AND TRANSDUCERS', false, NULL, NULL, NULL);
INSERT INTO public.courses (id, user_id, platform_id, external_course_id, name, is_deleted, course_code, instructor_name, description) VALUES ('375d5756-0c87-4e23-a9d7-f9b54088c30e', '44753a57-ac4a-47fb-8d09-fcaac605a110', 1, '868893388409', '2569-IPL', false, NULL, NULL, NULL);
INSERT INTO public.courses (id, user_id, platform_id, external_course_id, name, is_deleted, course_code, instructor_name, description) VALUES ('12eea155-c987-4ca5-b1d9-901f86bcdeff', '44753a57-ac4a-47fb-8d09-fcaac605a110', 1, '841462031915', 'SENSORS AND TRANSDUCERS', false, NULL, NULL, NULL);
INSERT INTO public.courses (id, user_id, platform_id, external_course_id, name, is_deleted, course_code, instructor_name, description) VALUES ('61e222f3-abc5-4457-aa3b-24f47eb358d9', 'c9e9fb99-810e-4205-8937-6ad66757e1dc', 1, '870252203369', '03376123-FDDC-2026', false, NULL, NULL, NULL);
INSERT INTO public.courses (id, user_id, platform_id, external_course_id, name, is_deleted, course_code, instructor_name, description) VALUES ('1c4ae749-7fa7-4010-a709-b15d792da4d2', 'c9e9fb99-810e-4205-8937-6ad66757e1dc', 1, '868893388409', '2569-IPL', false, NULL, NULL, NULL);
INSERT INTO public.courses (id, user_id, platform_id, external_course_id, name, is_deleted, course_code, instructor_name, description) VALUES ('cb4cec6b-01e4-49b8-b5b4-62dbebf9bdfd', 'c9e9fb99-810e-4205-8937-6ad66757e1dc', 1, '841462031915', 'SENSORS AND TRANSDUCERS', false, NULL, NULL, NULL);
INSERT INTO public.courses (id, user_id, platform_id, external_course_id, name, is_deleted, course_code, instructor_name, description) VALUES ('a4b82211-470f-4a04-a68a-731aa8e044e1', '612bed31-f86b-40b4-8ac0-4efe1234e8d6', 1, '870252203369', '03376123-FDDC-2026', false, NULL, NULL, NULL);
INSERT INTO public.courses (id, user_id, platform_id, external_course_id, name, is_deleted, course_code, instructor_name, description) VALUES ('ec54c5d6-ddb2-455b-acfe-9d04c3757792', '612bed31-f86b-40b4-8ac0-4efe1234e8d6', 1, '868893388409', '2569-IPL', false, NULL, NULL, NULL);
INSERT INTO public.courses (id, user_id, platform_id, external_course_id, name, is_deleted, course_code, instructor_name, description) VALUES ('079910bb-2332-463f-b3f9-2356cc2557ef', '612bed31-f86b-40b4-8ac0-4efe1234e8d6', 1, '841462031915', 'SENSORS AND TRANSDUCERS', false, NULL, NULL, NULL);


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('92908121-b1a3-4a0d-a400-26017d0fe02c', '1cdb5559-2c07-4ba8-a246-7c983b7fe7c3', '855627866245', 'แบบทดสอบก่อนเรียน', NULL, '2026-07-24 23:59:00+07', 'PUBLISHED', 'not_submitted', 'https://classroom.google.com/c/ODQ4MzMwODQyODIw/a/ODU1NjI3ODY2MjQ1/details', false, '2026-07-23 08:55:23.990778+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('7a3c0a9d-316f-41d3-9099-f2098a69d816', '1cdb5559-2c07-4ba8-a246-7c983b7fe7c3', '870436952339', 'ให้นักเรียนศึกษาข้อมูลจากรคลิปวิดีโอ', NULL, '2026-07-09 23:59:00+07', 'PUBLISHED', 'overdue', 'https://classroom.google.com/c/ODQ4MzMwODQyODIw/a/ODcwNDM2OTUyMzM5/details', false, '2026-07-23 08:55:23.997424+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('5c73813d-e299-4680-a0e1-acb16e3f3955', '1cdb5559-2c07-4ba8-a246-7c983b7fe7c3', '848540480048', 'ศึกษาคลิปวิดีโอเเละสรุปเนื้อหา', 'สรุปเนื้อกาที่ได้ศึกษาคลิปวิด๊โอเเละสรุปออกมาเป็นใบความรู้', '2026-03-28 23:59:00+07', 'PUBLISHED', 'overdue', 'https://classroom.google.com/c/ODQ4MzMwODQyODIw/a/ODQ4NTQwNDgwMDQ4/details', false, '2026-07-23 08:55:24.000366+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('72f330b3-d8ca-4914-9007-5e1b42e0b9e5', '1cdb5559-2c07-4ba8-a246-7c983b7fe7c3', '848539271829', 'midterm exam', NULL, '2026-03-28 23:59:00+07', 'PUBLISHED', 'submitted', 'https://classroom.google.com/c/ODQ4MzMwODQyODIw/a/ODQ4NTM5MjcxODI5/details', false, '2026-07-23 08:55:24.002567+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('ca6d26d4-50bd-4261-bb21-2166cc04e1e9', '1cdb5559-2c07-4ba8-a246-7c983b7fe7c3', '848540201648', 'ศึกษาคลิปวิดีโอเเละสรุปเนื้อหา', 'ศึกษาวิดีโอเรื่องยุคของ personal Computer เเละสรุปเนื้อหา', '2026-03-27 23:59:00+07', 'PUBLISHED', 'overdue', 'https://classroom.google.com/c/ODQ4MzMwODQyODIw/a/ODQ4NTQwMjAxNjQ4/details', false, '2026-07-23 08:55:24.004802+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('30cb2ead-d9a1-4eb9-bd45-53cc034873c9', '1cdb5559-2c07-4ba8-a246-7c983b7fe7c3', '856622556081', 'test001 l ส่งงาน', NULL, '2026-03-21 23:59:00+07', 'PUBLISHED', 'submitted', 'https://classroom.google.com/c/ODQ4MzMwODQyODIw/a/ODU2NjIyNTU2MDgx/details', false, '2026-07-23 08:55:24.007068+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('63ea4573-65ce-4538-89a6-e674bafdde36', '5c589519-69cc-4985-a593-ac2c5aa857a8', '855428522606', 'รายงานความก้าวหน้า ครั้งที่ 1', 'ต้องประกอบด้วยแผนการดำเนินงานและผล RCA เป็นอย่างน้อย
จัดส่งโดยตัวแทนกลุ่มเพียง 1 คนเท่านั้น (และต้องเป็นคนเดิมในการรายงานความก้าวหน้าทุกครั้ง)
จัดส่งเป็นไฟล์ PDF โดยตั้งชื่อไฟล์เป็น 2569-01-CTxx-report01 โดยที่ xx แทน Project ID', '2026-07-18 23:59:00+07', 'PUBLISHED', 'overdue', 'https://classroom.google.com/c/ODY4ODkzMzg4NDA5/a/ODU1NDI4NTIyNjA2/details', false, '2026-07-23 09:06:36.417606+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('0dde4fc0-20a0-4a54-84a2-cd9a95f1cd18', '3b270e5f-2b48-4f11-b8bd-4f92ec56ed28', '845011746996', 'ส่ง assignment ที่ 2', 'กำหนดส่งวันที่ 24 กุมภาพันธ์ 2569 เวลา 9.00 น', '2026-02-24 09:59:00+07', 'PUBLISHED', 'submitted', 'https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQ1MDExNzQ2OTk2/details', false, '2026-07-23 09:06:36.423324+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('e7daa4b0-8233-433a-93e4-26d0f6f18cbf', '3b270e5f-2b48-4f11-b8bd-4f92ec56ed28', '842704626389', 'ส่ง assignment ที่ 1', 'กำหนดส่งวันที่ 10 กุมภาพันธ์ 2569 เวลา 9.00 น', '2026-02-10 09:59:00+07', 'PUBLISHED', 'overdue', 'https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQyNzA0NjI2Mzg5/details', false, '2026-07-23 09:06:36.425719+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('01d3fe73-2c39-42fb-a7bd-c35f1ffdc405', 'ec54c5d6-ddb2-455b-acfe-9d04c3757792', '798495334576', 'รายงานความก้าวหน้า ครั้งที่ 2', '1. ต้องประกอบด้วยหัวข้อต่อไปนี้ (เป็นอย่างน้อย)
a) การตั้งสมมติฐาน
b) การกำหนดเกณฑ์ประเมิน
c) การจัดทำหัวข้อรายการสารบัญของปริญญานิพนธ์
d) การศึกษาหลักการ/ทฤษฎีพื้นฐานต่าง ๆ ที่เกี่ยวข้องกับโครงงาน

2. จัดส่งโดยตัวแทนกลุ่มเพียง 1 คนเท่านั้น (และต้องเป็นคนเดิมในการรายงานความก้าวหน้าทุกครั้ง)

3. สิ่งที่ต้องจัดส่ง
a) ไฟล์รายงานความก้าวหน้าที่ผ่านการลงนามจากอ.ที่ปรึกษา ในรูปแบบไฟล์ PDF โดยตั้งชื่อไฟล์เป็น 2569-01-CTxx-report02 (แทนที่ xx ด้วย Project ID)
b) ภาพถ่ายการเข้าพบอ.ที่ปรึกษา ซึ่งประกอบด้วยสมาชิกทุกคนและอ.ที่ปรึกษา', '2026-08-15 23:59:00+07', 'PUBLISHED', 'not_submitted', 'https://classroom.google.com/c/ODY4ODkzMzg4NDA5/a/Nzk4NDk1MzM0NTc2/details', false, '2026-08-13 01:33:50.638941+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('593cc9fb-fde7-4434-94de-782139a77a50', '1c4ae749-7fa7-4010-a709-b15d792da4d2', '855428522606', 'รายงานความก้าวหน้า ครั้งที่ 1', 'ต้องประกอบด้วยแผนการดำเนินงานและผล RCA เป็นอย่างน้อย
จัดส่งโดยตัวแทนกลุ่มเพียง 1 คนเท่านั้น (และต้องเป็นคนเดิมในการรายงานความก้าวหน้าทุกครั้ง)
จัดส่งเป็นไฟล์ PDF โดยตั้งชื่อไฟล์เป็น 2569-01-CTxx-report01 โดยที่ xx แทน Project ID', '2026-07-18 23:59:00+07', 'PUBLISHED', 'overdue', 'https://classroom.google.com/c/ODY4ODkzMzg4NDA5/a/ODU1NDI4NTIyNjA2/details', false, '2026-08-12 20:30:41.709116+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('5b61cc6d-6e42-4ae6-8c04-c83dc677b1ef', 'cb4cec6b-01e4-49b8-b5b4-62dbebf9bdfd', '845011746996', 'ส่ง assignment ที่ 2', 'กำหนดส่งวันที่ 24 กุมภาพันธ์ 2569 เวลา 9.00 น', '2026-02-24 09:59:00+07', 'PUBLISHED', 'submitted', 'https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQ1MDExNzQ2OTk2/details', false, '2026-08-12 20:30:41.95733+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('efdb979a-26b7-42b5-841f-94672a656781', 'cb4cec6b-01e4-49b8-b5b4-62dbebf9bdfd', '842704626389', 'ส่ง assignment ที่ 1', 'กำหนดส่งวันที่ 10 กุมภาพันธ์ 2569 เวลา 9.00 น', '2026-02-10 09:59:00+07', 'PUBLISHED', 'submitted', 'https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQyNzA0NjI2Mzg5/details', false, '2026-08-12 20:30:42.081683+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('2bc2eb71-b2b1-4de2-bf98-02d5bb86c264', '375d5756-0c87-4e23-a9d7-f9b54088c30e', '798495334576', 'รายงานความก้าวหน้า ครั้งที่ 2', '1. ต้องประกอบด้วยหัวข้อต่อไปนี้ (เป็นอย่างน้อย)
a) การตั้งสมมติฐาน
b) การกำหนดเกณฑ์ประเมิน
c) การจัดทำหัวข้อรายการสารบัญของปริญญานิพนธ์
d) การศึกษาหลักการ/ทฤษฎีพื้นฐานต่าง ๆ ที่เกี่ยวข้องกับโครงงาน

2. จัดส่งโดยตัวแทนกลุ่มเพียง 1 คนเท่านั้น (และต้องเป็นคนเดิมในการรายงานความก้าวหน้าทุกครั้ง)

3. สิ่งที่ต้องจัดส่ง
a) ไฟล์รายงานความก้าวหน้าที่ผ่านการลงนามจากอ.ที่ปรึกษา ในรูปแบบไฟล์ PDF โดยตั้งชื่อไฟล์เป็น 2569-01-CTxx-report02 (แทนที่ xx ด้วย Project ID)
b) ภาพถ่ายการเข้าพบอ.ที่ปรึกษา ซึ่งประกอบด้วยสมาชิกทุกคนและอ.ที่ปรึกษา', '2026-08-15 23:59:00+07', 'PUBLISHED', 'not_submitted', 'https://classroom.google.com/c/ODY4ODkzMzg4NDA5/a/Nzk4NDk1MzM0NTc2/details', false, '2026-08-12 20:30:02.760107+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('9bb6ada5-38e4-4a33-81d6-a9b271e9c43a', '375d5756-0c87-4e23-a9d7-f9b54088c30e', '855428522606', 'รายงานความก้าวหน้า ครั้งที่ 1', 'ต้องประกอบด้วยแผนการดำเนินงานและผล RCA เป็นอย่างน้อย
จัดส่งโดยตัวแทนกลุ่มเพียง 1 คนเท่านั้น (และต้องเป็นคนเดิมในการรายงานความก้าวหน้าทุกครั้ง)
จัดส่งเป็นไฟล์ PDF โดยตั้งชื่อไฟล์เป็น 2569-01-CTxx-report01 โดยที่ xx แทน Project ID', '2026-07-18 23:59:00+07', 'PUBLISHED', 'submitted', 'https://classroom.google.com/c/ODY4ODkzMzg4NDA5/a/ODU1NDI4NTIyNjA2/details', false, '2026-08-12 20:30:02.889161+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('870dbcd5-ef85-41d4-bc38-f26231a746a2', '12eea155-c987-4ca5-b1d9-901f86bcdeff', '845011746996', 'ส่ง assignment ที่ 2', 'กำหนดส่งวันที่ 24 กุมภาพันธ์ 2569 เวลา 9.00 น', '2026-02-24 09:59:00+07', 'PUBLISHED', 'submitted', 'https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQ1MDExNzQ2OTk2/details', false, '2026-08-12 20:30:03.133212+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('3d065553-d167-41a4-8c8e-9be8371c9ea6', '12eea155-c987-4ca5-b1d9-901f86bcdeff', '842704626389', 'ส่ง assignment ที่ 1', 'กำหนดส่งวันที่ 10 กุมภาพันธ์ 2569 เวลา 9.00 น', '2026-02-10 09:59:00+07', 'PUBLISHED', 'submitted', 'https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQyNzA0NjI2Mzg5/details', false, '2026-08-12 20:30:03.213519+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('2336241c-cb46-4c64-89c6-11c004e722c1', '61e222f3-abc5-4457-aa3b-24f47eb358d9', '872206662022', 'LAB-3 (5 คะแนน)', NULL, NULL, 'PUBLISHED', 'not_submitted', 'https://classroom.google.com/c/ODcwMjUyMjAzMzY5/a/ODcyMjA2NjYyMDIy/details', false, '2026-08-12 20:30:41.141673+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('9011d0ae-a3b8-4eb0-ad60-8ee6fe4176f8', '61e222f3-abc5-4457-aa3b-24f47eb358d9', '871632842094', 'LAB-2 (3 คะแนน)', NULL, NULL, 'PUBLISHED', 'not_submitted', 'https://classroom.google.com/c/ODcwMjUyMjAzMzY5/a/ODcxNjMyODQyMDk0/details', false, '2026-08-12 20:30:41.285477+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('f55c891a-2e7a-4b51-bf56-5a11c12e9d2a', '1c4ae749-7fa7-4010-a709-b15d792da4d2', '798495334576', 'รายงานความก้าวหน้า ครั้งที่ 2', '1. ต้องประกอบด้วยหัวข้อต่อไปนี้ (เป็นอย่างน้อย)
a) การตั้งสมมติฐาน
b) การกำหนดเกณฑ์ประเมิน
c) การจัดทำหัวข้อรายการสารบัญของปริญญานิพนธ์
d) การศึกษาหลักการ/ทฤษฎีพื้นฐานต่าง ๆ ที่เกี่ยวข้องกับโครงงาน

2. จัดส่งโดยตัวแทนกลุ่มเพียง 1 คนเท่านั้น (และต้องเป็นคนเดิมในการรายงานความก้าวหน้าทุกครั้ง)

3. สิ่งที่ต้องจัดส่ง
a) ไฟล์รายงานความก้าวหน้าที่ผ่านการลงนามจากอ.ที่ปรึกษา ในรูปแบบไฟล์ PDF โดยตั้งชื่อไฟล์เป็น 2569-01-CTxx-report02 (แทนที่ xx ด้วย Project ID)
b) ภาพถ่ายการเข้าพบอ.ที่ปรึกษา ซึ่งประกอบด้วยสมาชิกทุกคนและอ.ที่ปรึกษา', '2026-08-15 23:59:00+07', 'PUBLISHED', 'not_submitted', 'https://classroom.google.com/c/ODY4ODkzMzg4NDA5/a/Nzk4NDk1MzM0NTc2/details', false, '2026-08-12 20:30:41.58333+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('0c48f3d2-0a83-42ef-89bb-9bbbf6b17e1d', 'a4b82211-470f-4a04-a68a-731aa8e044e1', '872206662022', 'LAB-3 (5 คะแนน)', NULL, NULL, 'PUBLISHED', 'not_submitted', 'https://classroom.google.com/c/ODcwMjUyMjAzMzY5/a/ODcyMjA2NjYyMDIy/details', false, '2026-08-13 01:33:50.038919+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('7857cc79-2b3c-4684-bc26-b0e13307d8ec', 'a4b82211-470f-4a04-a68a-731aa8e044e1', '871632842094', 'LAB-2 (3 คะแนน)', NULL, NULL, 'PUBLISHED', 'not_submitted', 'https://classroom.google.com/c/ODcwMjUyMjAzMzY5/a/ODcxNjMyODQyMDk0/details', false, '2026-08-13 01:33:50.338954+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('93c1d6d5-cdd3-4de8-9b7d-36175bff5d3e', 'ec54c5d6-ddb2-455b-acfe-9d04c3757792', '855428522606', 'รายงานความก้าวหน้า ครั้งที่ 1', 'ต้องประกอบด้วยแผนการดำเนินงานและผล RCA เป็นอย่างน้อย
จัดส่งโดยตัวแทนกลุ่มเพียง 1 คนเท่านั้น (และต้องเป็นคนเดิมในการรายงานความก้าวหน้าทุกครั้ง)
จัดส่งเป็นไฟล์ PDF โดยตั้งชื่อไฟล์เป็น 2569-01-CTxx-report01 โดยที่ xx แทน Project ID', '2026-07-18 23:59:00+07', 'PUBLISHED', 'overdue', 'https://classroom.google.com/c/ODY4ODkzMzg4NDA5/a/ODU1NDI4NTIyNjA2/details', false, '2026-08-13 01:33:51.065021+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('12d5cf3c-d11d-40eb-b209-4d1a0bd88199', '079910bb-2332-463f-b3f9-2356cc2557ef', '845011746996', 'ส่ง assignment ที่ 2', 'กำหนดส่งวันที่ 24 กุมภาพันธ์ 2569 เวลา 9.00 น', '2026-02-24 09:59:00+07', 'PUBLISHED', 'submitted', 'https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQ1MDExNzQ2OTk2/details', false, '2026-08-13 01:33:51.447548+07');
INSERT INTO public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) VALUES ('1ae5e135-7e3f-4aa7-8a12-b7570a97c1b8', '079910bb-2332-463f-b3f9-2356cc2557ef', '842704626389', 'ส่ง assignment ที่ 1', 'กำหนดส่งวันที่ 10 กุมภาพันธ์ 2569 เวลา 9.00 น', '2026-02-10 09:59:00+07', 'PUBLISHED', 'submitted', 'https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQyNzA0NjI2Mzg5/details', false, '2026-08-13 01:33:51.522711+07');


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('5c9c1a4a-8641-4719-bfa5-4c86c6381b76', 'a8fba782-0dc6-4c52-9a88-8436eee8d3df', 'login', 'admin@kmitl.ac.th', 'null', '2026-08-06 09:25:11.850715+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('bbeaf1f7-f3a4-4d54-a7c6-26c7df8e0995', 'a8fba782-0dc6-4c52-9a88-8436eee8d3df', 'connection_flag_stale', 'chayanggoon.s13@gmail.com', '{"platform": "google"}', '2026-08-06 09:31:53.806657+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('bfdba8b0-ac0d-400f-8e45-e797a8a87fb5', 'a8fba782-0dc6-4c52-9a88-8436eee8d3df', 'login', 'admin@kmitl.ac.th', 'null', '2026-08-06 09:47:32.844117+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('acef4287-4fb7-41a0-a3e9-91d29027463e', 'ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 'login', '67030052@kmitl.ac.th', 'null', '2026-08-06 09:50:21.093916+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('ea5eba79-9841-4561-822b-53e37cd0ce55', 'a8fba782-0dc6-4c52-9a88-8436eee8d3df', 'login', 'admin@kmitl.ac.th', 'null', '2026-08-06 10:01:26.667871+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('12bc2d89-e95a-439a-9183-8a86c16390e4', 'a8fba782-0dc6-4c52-9a88-8436eee8d3df', 'login', 'admin@kmitl.ac.th', 'null', '2026-08-08 20:50:33.572806+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('6cc80d16-30ce-4824-82fb-f2d7624ca3cf', 'a8fba782-0dc6-4c52-9a88-8436eee8d3df', 'login', 'admin@kmitl.ac.th', 'null', '2026-08-12 20:01:02.503601+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('9e12bc40-f43d-443d-91e7-fbcb0f31c9fd', 'ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 'login', '67030052@kmitl.ac.th', 'null', '2026-08-12 20:01:29.063966+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('3f33acd5-d3e2-4971-ac82-aa6c2616af74', '44753a57-ac4a-47fb-8d09-fcaac605a110', 'login', '67030338@kmitl.ac.th', 'null', '2026-08-12 20:26:32.401417+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('319e6b1d-4085-486f-9003-de522c3a9d4c', 'c9e9fb99-810e-4205-8937-6ad66757e1dc', 'login', '67030037@kmitl.ac.th', 'null', '2026-08-12 20:28:30.6628+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('ec83e1eb-8f9e-4437-a27f-c87e7c05840e', 'c9e9fb99-810e-4205-8937-6ad66757e1dc', 'connect_platform', '67030037@kmitl.ac.th', '{"platform": "google_classroom"}', '2026-08-12 20:29:07.090653+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('091d5790-2aa7-42b1-99e5-404cbe46713b', '44753a57-ac4a-47fb-8d09-fcaac605a110', 'connect_platform', '67030338@kmitl.ac.th', '{"platform": "google_classroom"}', '2026-08-12 20:29:58.0078+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('52bcd2bb-ed46-4fbf-bf0a-76f410f67f98', 'c9e9fb99-810e-4205-8937-6ad66757e1dc', 'connect_platform', '67030037@kmitl.ac.th', '{"platform": "google_classroom"}', '2026-08-12 20:30:06.259632+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('b6ac3521-984c-4fe6-8572-e58fa944f8b2', 'c9e9fb99-810e-4205-8937-6ad66757e1dc', 'connect_platform', '67030037@kmitl.ac.th', '{"platform": "google_classroom"}', '2026-08-12 20:30:35.730271+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('30810851-6839-4ce4-a966-c8a581b34090', 'c9e9fb99-810e-4205-8937-6ad66757e1dc', 'login', '67030037@kmitl.ac.th', 'null', '2026-08-13 01:27:06.236167+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('fd6b186b-7b88-40a2-960b-453861050f2d', '612bed31-f86b-40b4-8ac0-4efe1234e8d6', 'login', '67030223@kmitl.ac.th', 'null', '2026-08-13 01:31:48.89463+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('4bce7280-e26b-436d-a8bf-084007ba0b4f', '612bed31-f86b-40b4-8ac0-4efe1234e8d6', 'connect_platform', '67030223@kmitl.ac.th', '{"platform": "google_classroom"}', '2026-08-13 01:33:12.833692+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('02d0467e-0161-4e1e-af15-3898374375d6', '612bed31-f86b-40b4-8ac0-4efe1234e8d6', 'connect_platform', '67030223@kmitl.ac.th', '{"platform": "google_classroom"}', '2026-08-13 01:33:42.825534+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('f31bcbe6-f189-4d2a-9ee1-8b17cad37dcf', '612bed31-f86b-40b4-8ac0-4efe1234e8d6', 'login', '67030223@kmitl.ac.th', 'null', '2026-08-13 08:07:25.910928+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('0bb69f3f-e5ab-493e-afc9-069abd91e8ec', 'ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 'login', '67030052@kmitl.ac.th', 'null', '2026-08-13 08:31:14.226297+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('88080b1f-df7c-4554-b21d-65605a823809', 'a8fba782-0dc6-4c52-9a88-8436eee8d3df', 'login', 'admin@kmitl.ac.th', 'null', '2026-08-13 08:32:53.364086+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('e5f0e972-d544-4863-9ce3-447d004fea05', 'a8fba782-0dc6-4c52-9a88-8436eee8d3df', 'login', 'admin@kmitl.ac.th', 'null', '2026-08-13 08:33:41.131565+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('c49e7509-56f2-4783-b096-87d4ca49fb06', 'ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 'login', '67030052@kmitl.ac.th', 'null', '2026-08-13 08:37:05.452725+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('de6ae5ac-c31a-49d6-ac6a-4f12a6f169e9', '44753a57-ac4a-47fb-8d09-fcaac605a110', 'login', '67030338@kmitl.ac.th', 'null', '2026-08-13 08:42:38.279972+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('fa2000b7-a1bf-482f-aa64-70b86e3b68dd', 'ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 'login', '67030052@kmitl.ac.th', 'null', '2026-08-13 08:53:37.907688+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('7b499267-57c5-4035-b862-086bc38e56bd', 'a8fba782-0dc6-4c52-9a88-8436eee8d3df', 'login', 'admin@kmitl.ac.th', 'null', '2026-08-13 09:01:31.666741+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('e2a46d78-91c5-4f28-bf3f-265bd37f47e2', '44753a57-ac4a-47fb-8d09-fcaac605a110', 'login', '67030338@kmitl.ac.th', 'null', '2026-08-13 09:08:21.231791+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('d30d7e49-03af-499f-9d2d-1c29a51891df', 'a8fba782-0dc6-4c52-9a88-8436eee8d3df', 'login', 'admin@kmitl.ac.th', 'null', '2026-08-13 09:37:15.356507+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('2204750c-a299-402a-8cf4-980f70e3cb9d', 'ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 'login', '67030052@kmitl.ac.th', 'null', '2026-08-13 09:37:27.139324+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('4a2134c8-5dd6-4f6f-a38f-a53fac078475', 'a8fba782-0dc6-4c52-9a88-8436eee8d3df', 'login', 'admin@kmitl.ac.th', 'null', '2026-08-13 09:48:03.918574+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('a99f09df-8052-42d9-992a-c1525fdb944d', 'ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 'login', '67030052@kmitl.ac.th', 'null', '2026-08-13 09:50:08.437474+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('a5e6971d-f4fd-419c-9679-ddda30e11ff1', 'ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 'login', '67030052@kmitl.ac.th', 'null', '2026-08-13 09:50:13.626958+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('5074fc12-c771-42c1-ae1b-2cf6d984bee8', 'a8fba782-0dc6-4c52-9a88-8436eee8d3df', 'login', 'admin@kmitl.ac.th', 'null', '2026-08-13 09:51:08.463807+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('6d9a3d41-2881-4896-83e8-83e898961711', 'a8fba782-0dc6-4c52-9a88-8436eee8d3df', 'connection_flag_stale', '67030338@kmitl.ac.th', '{"platform": "google"}', '2026-08-13 09:51:49.635171+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('67894c08-edf7-419a-b115-ae4b9cdc47b8', 'ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 'login', '67030052@kmitl.ac.th', 'null', '2026-08-13 10:51:49.922288+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('204f8705-76f9-47de-9df8-10486d65f937', '44753a57-ac4a-47fb-8d09-fcaac605a110', 'login', '67030338@kmitl.ac.th', 'null', '2026-08-14 21:06:00.282652+07');
INSERT INTO public.audit_logs (id, actor_user_id, action, target, metadata, created_at) VALUES ('8625008d-2ade-4dda-96b9-d2aa3abd79c2', '44753a57-ac4a-47fb-8d09-fcaac605a110', 'login', '67030338@kmitl.ac.th', 'null', '2026-08-14 21:09:52.560257+07');


--
-- Data for Name: notification_rules; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notification_settings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: oauth_connections; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.oauth_connections (id, user_id, platform_id, access_token_enc, refresh_token_enc, token_expires_at, status, connected_at) VALUES ('2e53359f-0a05-4b4d-b2ee-b2c5a23c213a', 'ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 1, 'gAAAAABqYXcmMKDiDru7dH1laefJBssykve1W65lNfwEt6q_EfKfD64VJA1MHfKrwjOc2B3mVE4OoOhntmBbEMEPljE3Ksf4cynXEygyk7wMgdWoGvDuB977DUz4dt9APDgZ_M0o31wUNqNXRJuI7zs9ERaD14MRZ1FPFCS_BrgrCnmSPQECD5EBedvtZ5IdHJUaBN-QGKUA9YveXPy-3-gaPJgDdkEl9lh3zinKrG2fTy1oQ02IKgZ-9dI0fqfn20f2RaWZ_MnAqkc1ZHFcuBZQvSxnS9n2z4sonVsJYIOOTqpRcy1RMmVVwWzzl9FBtqDKIdA-GbGUBgslbxHlci7nkxJjHLSMJG1dCY1kDyafKxM6-57CmhACHwY1W-gBHco0z-m37TVnfTl40d0K4ZWg04VEeeJzXA==', 'gAAAAABqYXcmFNnTd73X_jkYgslWEN-OwDIA1WB0Odw4LFP8MoPjJgTv18QVQD-_v3OfcbpBsfbWQvdQkmMtBNloIXz3qgH6vNWQmdGv_s26MyasZvpJAayB3vgUMyFgyyR91mvsU1UQzwMDDhmSKxY3qb7xGxWm1yGo6lHSkv2py3_bSCjtWOU0bsdhpTi8Ud-_czSPnRLk3tIzogGlOl8G6wLD54GFYQ==', '2026-07-23 10:06:29.207724+07', 'connected', '2026-07-23 09:06:18.258275+07');
INSERT INTO public.oauth_connections (id, user_id, platform_id, access_token_enc, refresh_token_enc, token_expires_at, status, connected_at) VALUES ('97e89d6a-38a5-4f7a-bfcd-5713e770e14f', 'e27363ae-d793-41a8-89f9-6026f247c0bf', 1, 'gAAAAABqYXSF2aDXgmHwMcLDmRpLGlmJgAEfMDcuYNKMIE6AC0f0oNyZTEEot9OhrkTIMyWdtTxj7q7QRoETlF5CFS0LqEy-2be7CUxECWQ5v7ImWF1ZLPUSHvc1mx8TdmZKeU-c1ZmWEdIK24eNCsEb4q6vVkeYAqlXBltan-gsaA9WCw4unGbq2o6iXxP240cuDtZ2HjI91SiRpPhHSoNTrGfvOosjLnv994GKs78qXkWPPuNbzN_Tr2whHf1b8H1bYCQwW16i47WabcCfhcXEC80bYAZad31T9nQWFMFv0VmSnNvH2oEwz_R_CbpGWUoVZSq7SRDeaAaPVcYb6kthID0_kvS9U11qiifMCeFrYK_ieRImwClSU-pyaAoYo75qBodS-n2iQHrCCVwiE_pYCOnF00J52A==', 'gAAAAABqYXSFTvH6vnJP8TGejn1PAg07y7NB0ktIJmYkB647aFsLAjuCEEla8AGZJPdi6IbgBKPnQ4TGXIvg4g3wialny0HgD7TKImP8zp_xh5RrQqzskfMDOSpMWgpLaMaNLIh8bJHBc966EIDBzymTxFypPWk7SPj1LSOvIQPO41sfr3lb2gmBwBH98ZKFvwtTAE-0WIxD1hOrb009R7vrYtYjOOA8Fg==', '2026-07-23 09:55:16.321664+07', 'stale', '2026-07-23 08:55:15.733969+07');
INSERT INTO public.oauth_connections (id, user_id, platform_id, access_token_enc, refresh_token_enc, token_expires_at, status, connected_at) VALUES ('e9e4107c-612d-4fc2-a01a-0498550b78ff', 'c9e9fb99-810e-4205-8937-6ad66757e1dc', 1, 'gAAAAABqfHV6fp-ZPD3jGjJptBIl-X_VQKHoBL-BUVVIZOhgqXFi0pmLERUg017mJQNmewTM_MaR2KqKk4OjwdcJvkYbS-ORUT9dErzUNTQ9OEpG9Yr7M8OcYL95YJxJO1KqHi-_cd3cpvOfGMtG1SLiRqd04CCn7KIEkTKcfFWhs52XkK9Q01ZR2DdBdZ6L6zfLc_MGM8uKpWZiDSISqD79nT6WdBVb8Zf5CpKrAeb2ZF_l87k2-sxphI6w0fVjryb9vob3qTHRi9A1It4y72FtTYpzVuEl27y_JYoypIpS8aevroCKGzodRKd3YDI4AjUi5rwzWeY8cSZ5LyR6r1ofm1qCYQMGqR4eGyKHqXUdoNLElbs_XNeKElrro4wXvLg3P3wOT00bIk6TwaOOqs6JJhfQ68k-0w==', 'gAAAAABqfHV6tzVJVyLh-EgXxXiEBgRBvE3CnJMu5caHaQCvlIjwxP37k0LaV-hDgiJ1W4-Q5SDsrit7Z8k6WvShYHXcbKbb_5hK0aqztFNYMm4ad4112XzJhBHkqrvJaFJsqjojyJH6M4JClvesifCU5mrU2Y5HOlakyir8F-D1w-oAOgFYwAZkbRqsGjL-J7Cs6ecZp8P3y83NAGCKXcPPEafdD8b2_Q==', '2026-08-12 21:30:33.347385+07', 'connected', '2026-08-12 20:29:05.670925+07');
INSERT INTO public.oauth_connections (id, user_id, platform_id, access_token_enc, refresh_token_enc, token_expires_at, status, connected_at) VALUES ('afa69ef3-033b-42df-b7be-79c638725679', '612bed31-f86b-40b4-8ac0-4efe1234e8d6', 1, 'gAAAAABqfLyGyVl-Ls0bI9rflz8EG0_czLaMdDpKVnd8k0WQu67X1xTNSTqSxStgnUuVjnpAyCpMzIdPRF_KIqQvsuOYFC6Jay26pPrQ7Asza19UYDW99EYhiBdiuLzpP2jem3YiJ1EBK2pXYi8qz11ZCnUWYigc2A1MaPRZ9p9GOQYlVlvwVl7skWb0YBfIaISZhVhyqW8DKbD4quP-1G2dZmmW-klPWRry_ayJdb_ZkxEqjijugco9FarYsxJoPjQufy_ppg8XjrXFeGD-g54BsmEZoUGYWEQ_CM7yT2mJPdEHzevzadc3W3SDxYKZmgkCM2GBvaQuCCVXwdvb91B7AtsJga2OLLzz49AreRFdCoX1wrfCg9zW0bk_3fxvmsYrtkrLZdNu0ldm1kRKHp-eoD-FspeKog==', 'gAAAAABqfLyGQ5Bf1BlHvoektEmCNW0PZfe_I3b0HbTKXGSLc5HW0CNp05sbgcKKe9y4XeOeR6XnWbbMaZlpu3ksl-cs1nvEyTseT7m2MWzb7PewMgETw1lOBLpiSznGwhsp2FpfgY-r2sDoc34-9XhX15ih83K9JlkA6sRS0_PjLhREx-TXh43linPBy6flzDfR8UgkvyOiQbik_xO7LyHcYloQRs-hxg==', '2026-08-13 02:33:41.614446+07', 'connected', '2026-08-13 01:33:12.046103+07');
INSERT INTO public.oauth_connections (id, user_id, platform_id, access_token_enc, refresh_token_enc, token_expires_at, status, connected_at) VALUES ('f18b4057-7766-429c-80bd-6bd3184cf7c3', '44753a57-ac4a-47fb-8d09-fcaac605a110', 1, 'gAAAAABqfHVVrLG4adHEZm5AI5poPHcKx0n6e4DXv9kUVGjgGDHw8J1vx_z4BXxHKOKRVB8QR3l4Rrl2WLWEk6mhYlw-6lL5ajCVFBjpx_Bzlqd603oldWJBktNL-Pz2wACiXH_X93H_fEBxcANtZ5LffkyWChSjYP9kmx-7uqqe6us3rWM23hukmPn12T_ZiLxoH8CRc_Htpw4eqTxjj5tube-rVVlBzDyQq7GMBMcCq4nhca3OmK64Ua_pCcTcEaEG10YLe2f9xM4pfwMIF9_3n-AYdmbV-RICPDyArJP5hNn_lKCQsrFhQw4Ed7W8zWjKcp-rGRROIesHIKEXRARUfpEUiuwMxf7cWBjeZ1Vx1Zsv9Cn4Q_ZzeiqoLsYYu2yrcJxjSot0-Ho4fkFcHfNEVCb-cKFFaQ==', 'gAAAAABqfHVVR9J8w8Si7raHnANit05a5UYvNeYgPVdLgK6hJV9_HsOxHKProYPfv7NrHppmVzlImMxFBZcaVxSAaFWQkUetON8NW9ysPYNHadgk2Sg3zs5FZ6dBjKuYRN1zOO181NjFAS6G3UclVrOPLAVKUWyfBjebsWWdxK2fMKYYu1DopxGC2hir--i-Juu0MKzRUjT1g-knh9Hfq69zmYTl06iznw==', '2026-08-12 21:29:56.040838+07', 'stale', '2026-08-12 20:29:56.398447+07');


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.roles (id, name) VALUES (3, 'student');
INSERT INTO public.roles (id, name) VALUES (4, 'admin');


--
-- Data for Name: sync_logs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.sync_logs (id, user_id, platform_id, status, items_synced, error_detail, started_at, finished_at) VALUES ('d376eb76-9eef-4436-ba55-60a8d3e6b5e0', 'e27363ae-d793-41a8-89f9-6026f247c0bf', 1, 'success', 6, NULL, '2026-07-23 08:55:17.352266+07', '2026-07-23 08:55:24.015697+07');
INSERT INTO public.sync_logs (id, user_id, platform_id, status, items_synced, error_detail, started_at, finished_at) VALUES ('36146a7a-fa44-4b6c-8b01-658be20011e5', 'ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 1, 'success', 3, NULL, '2026-07-23 09:06:19.585605+07', '2026-07-23 09:06:24.884457+07');
INSERT INTO public.sync_logs (id, user_id, platform_id, status, items_synced, error_detail, started_at, finished_at) VALUES ('4ed02bf5-dc53-4292-997f-bd5955a528ca', 'ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 1, 'success', 3, NULL, '2026-07-23 09:06:30.218834+07', '2026-07-23 09:06:36.429814+07');
INSERT INTO public.sync_logs (id, user_id, platform_id, status, items_synced, error_detail, started_at, finished_at) VALUES ('c9760d67-9838-4cdb-8bdf-62ec72fa76a3', 'c9e9fb99-810e-4205-8937-6ad66757e1dc', 1, 'success', 4, NULL, '2026-08-03 11:01:47.940495+07', '2026-08-03 11:01:52.399594+07');
INSERT INTO public.sync_logs (id, user_id, platform_id, status, items_synced, error_detail, started_at, finished_at) VALUES ('dc1822f6-3925-497d-937c-9b75c2cd2466', 'c9e9fb99-810e-4205-8937-6ad66757e1dc', 1, 'success', 0, NULL, '2026-08-12 20:29:07.10454+07', '2026-08-12 20:29:09.004559+07');
INSERT INTO public.sync_logs (id, user_id, platform_id, status, items_synced, error_detail, started_at, finished_at) VALUES ('a3126043-0fae-4595-9b2f-1678c74e90d1', '44753a57-ac4a-47fb-8d09-fcaac605a110', 1, 'success', 4, NULL, '2026-08-12 20:29:57.995323+07', '2026-08-12 20:30:03.417356+07');
INSERT INTO public.sync_logs (id, user_id, platform_id, status, items_synced, error_detail, started_at, finished_at) VALUES ('50e5d994-7deb-472b-9948-92b788bd76dc', 'c9e9fb99-810e-4205-8937-6ad66757e1dc', 1, 'success', 6, NULL, '2026-08-12 20:30:05.990401+07', '2026-08-12 20:30:13.516238+07');
INSERT INTO public.sync_logs (id, user_id, platform_id, status, items_synced, error_detail, started_at, finished_at) VALUES ('6dbf9f24-a0ba-4088-b2b0-5cbc0b635e25', 'c9e9fb99-810e-4205-8937-6ad66757e1dc', 1, 'success', 6, NULL, '2026-08-12 20:30:35.448255+07', '2026-08-12 20:30:42.322412+07');
INSERT INTO public.sync_logs (id, user_id, platform_id, status, items_synced, error_detail, started_at, finished_at) VALUES ('d3458a44-c859-4910-a156-ca281c0bb5f1', '612bed31-f86b-40b4-8ac0-4efe1234e8d6', 1, 'success', 6, NULL, '2026-08-13 01:33:14.030278+07', '2026-08-13 01:33:20.42189+07');
INSERT INTO public.sync_logs (id, user_id, platform_id, status, items_synced, error_detail, started_at, finished_at) VALUES ('113e8779-7f1f-421f-b088-f655ad15e5fa', '612bed31-f86b-40b4-8ac0-4efe1234e8d6', 1, 'success', 6, NULL, '2026-08-13 01:33:44.717882+07', '2026-08-13 01:33:51.678749+07');


--
-- Data for Name: user_assignment_status; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_roles (user_id, role_id) VALUES ('e27363ae-d793-41a8-89f9-6026f247c0bf', 3);
INSERT INTO public.user_roles (user_id, role_id) VALUES ('ab757724-cfeb-4ce2-ae6c-0a4d1d69effc', 3);
INSERT INTO public.user_roles (user_id, role_id) VALUES ('c9e9fb99-810e-4205-8937-6ad66757e1dc', 3);
INSERT INTO public.user_roles (user_id, role_id) VALUES ('a8fba782-0dc6-4c52-9a88-8436eee8d3df', 4);
INSERT INTO public.user_roles (user_id, role_id) VALUES ('44753a57-ac4a-47fb-8d09-fcaac605a110', 3);
INSERT INTO public.user_roles (user_id, role_id) VALUES ('612bed31-f86b-40b4-8ac0-4efe1234e8d6', 3);


--
-- Name: platforms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.platforms_id_seq', 3, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 4, true);


--
-- PostgreSQL database dump complete
--


