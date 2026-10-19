-- KMAPS public-schema restore for Neon PostgreSQL
-- Generated from a Supabase cluster dump; Supabase-managed objects are excluded.
\set ON_ERROR_STOP on
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
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);



--

--
-- Name: assignments; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.assignments (
    id uuid NOT NULL,
    course_id uuid NOT NULL,
    external_assignment_id character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    due_at timestamp with time zone,
    source_status character varying(30) NOT NULL,
    computed_status character varying(20) NOT NULL,
    source_url text NOT NULL,
    is_deleted boolean NOT NULL,
    last_synced_at timestamp with time zone DEFAULT now() NOT NULL
);



--

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    actor_user_id uuid,
    action character varying(100) NOT NULL,
    target character varying(255),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



--

--
-- Name: courses; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.courses (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    platform_id smallint NOT NULL,
    external_course_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    is_deleted boolean NOT NULL,
    course_code character varying(50),
    instructor_name character varying(255),
    description text
);



--

--
-- Name: notification_rules; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.notification_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(20) DEFAULT 'due_soon' NOT NULL,
    lead_time_minutes integer NOT NULL,
    sequence_order smallint NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



--

--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.notification_settings (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    lead_time_minutes integer DEFAULT 60 NOT NULL,
    reminder_intervals jsonb,
    new_assignment_enabled boolean DEFAULT true NOT NULL,
    due_soon_enabled boolean DEFAULT true NOT NULL,
    overdue_enabled boolean DEFAULT true NOT NULL,
    channel character varying(20) DEFAULT 'push' NOT NULL
);



--

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    assignment_id uuid,
    notification_rule_id uuid,
    type character varying(20) NOT NULL,
    tier smallint DEFAULT 1 NOT NULL,
    status character varying(20) DEFAULT 'pending' NOT NULL,
    retry_count smallint DEFAULT 0 NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    delivered_at timestamp with time zone
);



--

--
-- Name: oauth_connections; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.oauth_connections (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    platform_id smallint NOT NULL,
    access_token_enc text NOT NULL,
    refresh_token_enc text,
    token_expires_at timestamp with time zone,
    status character varying(20) NOT NULL,
    connected_at timestamp with time zone DEFAULT now() NOT NULL
);



--

--
-- Name: platforms; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.platforms (
    id smallint NOT NULL,
    name character varying(50) NOT NULL
);



--

--
-- Name: platforms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--
--

CREATE SEQUENCE public.platforms_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--

--
-- Name: platforms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--
--

ALTER SEQUENCE public.platforms_id_seq OWNED BY public.platforms.id;


--

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.roles (
    id smallint NOT NULL,
    name character varying(50) NOT NULL
);



--

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--
--

CREATE SEQUENCE public.roles_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--

--
-- Name: sync_logs; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.sync_logs (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    platform_id smallint NOT NULL,
    status character varying(20) NOT NULL,
    items_synced integer NOT NULL,
    error_detail jsonb,
    started_at timestamp with time zone NOT NULL,
    finished_at timestamp with time zone
);



--

--
-- Name: user_assignment_status; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.user_assignment_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    assignment_id uuid NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    last_viewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



--

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_id smallint NOT NULL
);



--

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    display_name character varying(150) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



--

--
-- Name: password_recovery_tokens; Type: TABLE; Schema: public; Owner: postgres
--
--

CREATE TABLE public.password_recovery_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



--

--
-- Name: platforms id; Type: DEFAULT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.platforms ALTER COLUMN id SET DEFAULT nextval('public.platforms_id_seq'::regclass);


--

--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--

--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--
--

COPY public.alembic_version (version_num) FROM stdin;
0f9f537f2d5a
\.


--

--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--
--

COPY public.assignments (id, course_id, external_assignment_id, title, description, due_at, source_status, computed_status, source_url, is_deleted, last_synced_at) FROM stdin;
92908121-b1a3-4a0d-a400-26017d0fe02c	1cdb5559-2c07-4ba8-a246-7c983b7fe7c3	855627866245	แบบทดสอบก่อนเรียน	\N	2026-07-24 16:59:00+00	PUBLISHED	not_submitted	https://classroom.google.com/c/ODQ4MzMwODQyODIw/a/ODU1NjI3ODY2MjQ1/details	f	2026-07-23 01:55:23.990778+00
7a3c0a9d-316f-41d3-9099-f2098a69d816	1cdb5559-2c07-4ba8-a246-7c983b7fe7c3	870436952339	ให้นักเรียนศึกษาข้อมูลจากรคลิปวิดีโอ	\N	2026-07-09 16:59:00+00	PUBLISHED	overdue	https://classroom.google.com/c/ODQ4MzMwODQyODIw/a/ODcwNDM2OTUyMzM5/details	f	2026-07-23 01:55:23.997424+00
5c73813d-e299-4680-a0e1-acb16e3f3955	1cdb5559-2c07-4ba8-a246-7c983b7fe7c3	848540480048	ศึกษาคลิปวิดีโอเเละสรุปเนื้อหา	สรุปเนื้อกาที่ได้ศึกษาคลิปวิด๊โอเเละสรุปออกมาเป็นใบความรู้	2026-03-28 16:59:00+00	PUBLISHED	overdue	https://classroom.google.com/c/ODQ4MzMwODQyODIw/a/ODQ4NTQwNDgwMDQ4/details	f	2026-07-23 01:55:24.000366+00
72f330b3-d8ca-4914-9007-5e1b42e0b9e5	1cdb5559-2c07-4ba8-a246-7c983b7fe7c3	848539271829	midterm exam	\N	2026-03-28 16:59:00+00	PUBLISHED	submitted	https://classroom.google.com/c/ODQ4MzMwODQyODIw/a/ODQ4NTM5MjcxODI5/details	f	2026-07-23 01:55:24.002567+00
ca6d26d4-50bd-4261-bb21-2166cc04e1e9	1cdb5559-2c07-4ba8-a246-7c983b7fe7c3	848540201648	ศึกษาคลิปวิดีโอเเละสรุปเนื้อหา	ศึกษาวิดีโอเรื่องยุคของ personal Computer เเละสรุปเนื้อหา	2026-03-27 16:59:00+00	PUBLISHED	overdue	https://classroom.google.com/c/ODQ4MzMwODQyODIw/a/ODQ4NTQwMjAxNjQ4/details	f	2026-07-23 01:55:24.004802+00
30cb2ead-d9a1-4eb9-bd45-53cc034873c9	1cdb5559-2c07-4ba8-a246-7c983b7fe7c3	856622556081	test001 l ส่งงาน	\N	2026-03-21 16:59:00+00	PUBLISHED	submitted	https://classroom.google.com/c/ODQ4MzMwODQyODIw/a/ODU2NjIyNTU2MDgx/details	f	2026-07-23 01:55:24.007068+00
63ea4573-65ce-4538-89a6-e674bafdde36	5c589519-69cc-4985-a593-ac2c5aa857a8	855428522606	รายงานความก้าวหน้า ครั้งที่ 1	ต้องประกอบด้วยแผนการดำเนินงานและผล RCA เป็นอย่างน้อย\r\nจัดส่งโดยตัวแทนกลุ่มเพียง 1 คนเท่านั้น (และต้องเป็นคนเดิมในการรายงานความก้าวหน้าทุกครั้ง)\r\nจัดส่งเป็นไฟล์ PDF โดยตั้งชื่อไฟล์เป็น 2569-01-CTxx-report01 โดยที่ xx แทน Project ID	2026-07-18 16:59:00+00	PUBLISHED	overdue	https://classroom.google.com/c/ODY4ODkzMzg4NDA5/a/ODU1NDI4NTIyNjA2/details	f	2026-07-23 02:06:36.417606+00
0dde4fc0-20a0-4a54-84a2-cd9a95f1cd18	3b270e5f-2b48-4f11-b8bd-4f92ec56ed28	845011746996	ส่ง assignment ที่ 2	กำหนดส่งวันที่ 24 กุมภาพันธ์ 2569 เวลา 9.00 น	2026-02-24 02:59:00+00	PUBLISHED	submitted	https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQ1MDExNzQ2OTk2/details	f	2026-07-23 02:06:36.423324+00
e7daa4b0-8233-433a-93e4-26d0f6f18cbf	3b270e5f-2b48-4f11-b8bd-4f92ec56ed28	842704626389	ส่ง assignment ที่ 1	กำหนดส่งวันที่ 10 กุมภาพันธ์ 2569 เวลา 9.00 น	2026-02-10 02:59:00+00	PUBLISHED	overdue	https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQyNzA0NjI2Mzg5/details	f	2026-07-23 02:06:36.425719+00
01d3fe73-2c39-42fb-a7bd-c35f1ffdc405	ec54c5d6-ddb2-455b-acfe-9d04c3757792	798495334576	รายงานความก้าวหน้า ครั้งที่ 2	1. ต้องประกอบด้วยหัวข้อต่อไปนี้ (เป็นอย่างน้อย)\na) การตั้งสมมติฐาน\nb) การกำหนดเกณฑ์ประเมิน\nc) การจัดทำหัวข้อรายการสารบัญของปริญญานิพนธ์\nd) การศึกษาหลักการ/ทฤษฎีพื้นฐานต่าง ๆ ที่เกี่ยวข้องกับโครงงาน\n\n2. จัดส่งโดยตัวแทนกลุ่มเพียง 1 คนเท่านั้น (และต้องเป็นคนเดิมในการรายงานความก้าวหน้าทุกครั้ง)\n\n3. สิ่งที่ต้องจัดส่ง\na) ไฟล์รายงานความก้าวหน้าที่ผ่านการลงนามจากอ.ที่ปรึกษา ในรูปแบบไฟล์ PDF โดยตั้งชื่อไฟล์เป็น 2569-01-CTxx-report02 (แทนที่ xx ด้วย Project ID)\nb) ภาพถ่ายการเข้าพบอ.ที่ปรึกษา ซึ่งประกอบด้วยสมาชิกทุกคนและอ.ที่ปรึกษา	2026-08-15 16:59:00+00	PUBLISHED	not_submitted	https://classroom.google.com/c/ODY4ODkzMzg4NDA5/a/Nzk4NDk1MzM0NTc2/details	f	2026-08-12 18:33:50.638941+00
593cc9fb-fde7-4434-94de-782139a77a50	1c4ae749-7fa7-4010-a709-b15d792da4d2	855428522606	รายงานความก้าวหน้า ครั้งที่ 1	ต้องประกอบด้วยแผนการดำเนินงานและผล RCA เป็นอย่างน้อย\nจัดส่งโดยตัวแทนกลุ่มเพียง 1 คนเท่านั้น (และต้องเป็นคนเดิมในการรายงานความก้าวหน้าทุกครั้ง)\nจัดส่งเป็นไฟล์ PDF โดยตั้งชื่อไฟล์เป็น 2569-01-CTxx-report01 โดยที่ xx แทน Project ID	2026-07-18 16:59:00+00	PUBLISHED	overdue	https://classroom.google.com/c/ODY4ODkzMzg4NDA5/a/ODU1NDI4NTIyNjA2/details	f	2026-08-12 13:30:41.709116+00
5b61cc6d-6e42-4ae6-8c04-c83dc677b1ef	cb4cec6b-01e4-49b8-b5b4-62dbebf9bdfd	845011746996	ส่ง assignment ที่ 2	กำหนดส่งวันที่ 24 กุมภาพันธ์ 2569 เวลา 9.00 น	2026-02-24 02:59:00+00	PUBLISHED	submitted	https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQ1MDExNzQ2OTk2/details	f	2026-08-12 13:30:41.95733+00
efdb979a-26b7-42b5-841f-94672a656781	cb4cec6b-01e4-49b8-b5b4-62dbebf9bdfd	842704626389	ส่ง assignment ที่ 1	กำหนดส่งวันที่ 10 กุมภาพันธ์ 2569 เวลา 9.00 น	2026-02-10 02:59:00+00	PUBLISHED	submitted	https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQyNzA0NjI2Mzg5/details	f	2026-08-12 13:30:42.081683+00
2bc2eb71-b2b1-4de2-bf98-02d5bb86c264	375d5756-0c87-4e23-a9d7-f9b54088c30e	798495334576	รายงานความก้าวหน้า ครั้งที่ 2	1. ต้องประกอบด้วยหัวข้อต่อไปนี้ (เป็นอย่างน้อย)\na) การตั้งสมมติฐาน\nb) การกำหนดเกณฑ์ประเมิน\nc) การจัดทำหัวข้อรายการสารบัญของปริญญานิพนธ์\nd) การศึกษาหลักการ/ทฤษฎีพื้นฐานต่าง ๆ ที่เกี่ยวข้องกับโครงงาน\n\n2. จัดส่งโดยตัวแทนกลุ่มเพียง 1 คนเท่านั้น (และต้องเป็นคนเดิมในการรายงานความก้าวหน้าทุกครั้ง)\n\n3. สิ่งที่ต้องจัดส่ง\na) ไฟล์รายงานความก้าวหน้าที่ผ่านการลงนามจากอ.ที่ปรึกษา ในรูปแบบไฟล์ PDF โดยตั้งชื่อไฟล์เป็น 2569-01-CTxx-report02 (แทนที่ xx ด้วย Project ID)\nb) ภาพถ่ายการเข้าพบอ.ที่ปรึกษา ซึ่งประกอบด้วยสมาชิกทุกคนและอ.ที่ปรึกษา	2026-08-15 16:59:00+00	PUBLISHED	not_submitted	https://classroom.google.com/c/ODY4ODkzMzg4NDA5/a/Nzk4NDk1MzM0NTc2/details	f	2026-08-12 13:30:02.760107+00
9bb6ada5-38e4-4a33-81d6-a9b271e9c43a	375d5756-0c87-4e23-a9d7-f9b54088c30e	855428522606	รายงานความก้าวหน้า ครั้งที่ 1	ต้องประกอบด้วยแผนการดำเนินงานและผล RCA เป็นอย่างน้อย\nจัดส่งโดยตัวแทนกลุ่มเพียง 1 คนเท่านั้น (และต้องเป็นคนเดิมในการรายงานความก้าวหน้าทุกครั้ง)\nจัดส่งเป็นไฟล์ PDF โดยตั้งชื่อไฟล์เป็น 2569-01-CTxx-report01 โดยที่ xx แทน Project ID	2026-07-18 16:59:00+00	PUBLISHED	submitted	https://classroom.google.com/c/ODY4ODkzMzg4NDA5/a/ODU1NDI4NTIyNjA2/details	f	2026-08-12 13:30:02.889161+00
870dbcd5-ef85-41d4-bc38-f26231a746a2	12eea155-c987-4ca5-b1d9-901f86bcdeff	845011746996	ส่ง assignment ที่ 2	กำหนดส่งวันที่ 24 กุมภาพันธ์ 2569 เวลา 9.00 น	2026-02-24 02:59:00+00	PUBLISHED	submitted	https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQ1MDExNzQ2OTk2/details	f	2026-08-12 13:30:03.133212+00
3d065553-d167-41a4-8c8e-9be8371c9ea6	12eea155-c987-4ca5-b1d9-901f86bcdeff	842704626389	ส่ง assignment ที่ 1	กำหนดส่งวันที่ 10 กุมภาพันธ์ 2569 เวลา 9.00 น	2026-02-10 02:59:00+00	PUBLISHED	submitted	https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQyNzA0NjI2Mzg5/details	f	2026-08-12 13:30:03.213519+00
2336241c-cb46-4c64-89c6-11c004e722c1	61e222f3-abc5-4457-aa3b-24f47eb358d9	872206662022	LAB-3 (5 คะแนน)	\N	\N	PUBLISHED	not_submitted	https://classroom.google.com/c/ODcwMjUyMjAzMzY5/a/ODcyMjA2NjYyMDIy/details	f	2026-08-12 13:30:41.141673+00
9011d0ae-a3b8-4eb0-ad60-8ee6fe4176f8	61e222f3-abc5-4457-aa3b-24f47eb358d9	871632842094	LAB-2 (3 คะแนน)	\N	\N	PUBLISHED	not_submitted	https://classroom.google.com/c/ODcwMjUyMjAzMzY5/a/ODcxNjMyODQyMDk0/details	f	2026-08-12 13:30:41.285477+00
f55c891a-2e7a-4b51-bf56-5a11c12e9d2a	1c4ae749-7fa7-4010-a709-b15d792da4d2	798495334576	รายงานความก้าวหน้า ครั้งที่ 2	1. ต้องประกอบด้วยหัวข้อต่อไปนี้ (เป็นอย่างน้อย)\na) การตั้งสมมติฐาน\nb) การกำหนดเกณฑ์ประเมิน\nc) การจัดทำหัวข้อรายการสารบัญของปริญญานิพนธ์\nd) การศึกษาหลักการ/ทฤษฎีพื้นฐานต่าง ๆ ที่เกี่ยวข้องกับโครงงาน\n\n2. จัดส่งโดยตัวแทนกลุ่มเพียง 1 คนเท่านั้น (และต้องเป็นคนเดิมในการรายงานความก้าวหน้าทุกครั้ง)\n\n3. สิ่งที่ต้องจัดส่ง\na) ไฟล์รายงานความก้าวหน้าที่ผ่านการลงนามจากอ.ที่ปรึกษา ในรูปแบบไฟล์ PDF โดยตั้งชื่อไฟล์เป็น 2569-01-CTxx-report02 (แทนที่ xx ด้วย Project ID)\nb) ภาพถ่ายการเข้าพบอ.ที่ปรึกษา ซึ่งประกอบด้วยสมาชิกทุกคนและอ.ที่ปรึกษา	2026-08-15 16:59:00+00	PUBLISHED	not_submitted	https://classroom.google.com/c/ODY4ODkzMzg4NDA5/a/Nzk4NDk1MzM0NTc2/details	f	2026-08-12 13:30:41.58333+00
0c48f3d2-0a83-42ef-89bb-9bbbf6b17e1d	a4b82211-470f-4a04-a68a-731aa8e044e1	872206662022	LAB-3 (5 คะแนน)	\N	\N	PUBLISHED	not_submitted	https://classroom.google.com/c/ODcwMjUyMjAzMzY5/a/ODcyMjA2NjYyMDIy/details	f	2026-08-12 18:33:50.038919+00
7857cc79-2b3c-4684-bc26-b0e13307d8ec	a4b82211-470f-4a04-a68a-731aa8e044e1	871632842094	LAB-2 (3 คะแนน)	\N	\N	PUBLISHED	not_submitted	https://classroom.google.com/c/ODcwMjUyMjAzMzY5/a/ODcxNjMyODQyMDk0/details	f	2026-08-12 18:33:50.338954+00
93c1d6d5-cdd3-4de8-9b7d-36175bff5d3e	ec54c5d6-ddb2-455b-acfe-9d04c3757792	855428522606	รายงานความก้าวหน้า ครั้งที่ 1	ต้องประกอบด้วยแผนการดำเนินงานและผล RCA เป็นอย่างน้อย\nจัดส่งโดยตัวแทนกลุ่มเพียง 1 คนเท่านั้น (และต้องเป็นคนเดิมในการรายงานความก้าวหน้าทุกครั้ง)\nจัดส่งเป็นไฟล์ PDF โดยตั้งชื่อไฟล์เป็น 2569-01-CTxx-report01 โดยที่ xx แทน Project ID	2026-07-18 16:59:00+00	PUBLISHED	overdue	https://classroom.google.com/c/ODY4ODkzMzg4NDA5/a/ODU1NDI4NTIyNjA2/details	f	2026-08-12 18:33:51.065021+00
12d5cf3c-d11d-40eb-b209-4d1a0bd88199	079910bb-2332-463f-b3f9-2356cc2557ef	845011746996	ส่ง assignment ที่ 2	กำหนดส่งวันที่ 24 กุมภาพันธ์ 2569 เวลา 9.00 น	2026-02-24 02:59:00+00	PUBLISHED	submitted	https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQ1MDExNzQ2OTk2/details	f	2026-08-12 18:33:51.447548+00
1ae5e135-7e3f-4aa7-8a12-b7570a97c1b8	079910bb-2332-463f-b3f9-2356cc2557ef	842704626389	ส่ง assignment ที่ 1	กำหนดส่งวันที่ 10 กุมภาพันธ์ 2569 เวลา 9.00 น	2026-02-10 02:59:00+00	PUBLISHED	submitted	https://classroom.google.com/c/ODQxNDYyMDMxOTE1/a/ODQyNzA0NjI2Mzg5/details	f	2026-08-12 18:33:51.522711+00
\.


--

--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--
--

COPY public.audit_logs (id, actor_user_id, action, target, metadata, created_at) FROM stdin;
5c9c1a4a-8641-4719-bfa5-4c86c6381b76	a8fba782-0dc6-4c52-9a88-8436eee8d3df	login	admin@kmitl.ac.th	null	2026-08-06 02:25:11.850715+00
bbeaf1f7-f3a4-4d54-a7c6-26c7df8e0995	a8fba782-0dc6-4c52-9a88-8436eee8d3df	connection_flag_stale	chayanggoon.s13@gmail.com	{"platform": "google"}	2026-08-06 02:31:53.806657+00
bfdba8b0-ac0d-400f-8e45-e797a8a87fb5	a8fba782-0dc6-4c52-9a88-8436eee8d3df	login	admin@kmitl.ac.th	null	2026-08-06 02:47:32.844117+00
acef4287-4fb7-41a0-a3e9-91d29027463e	ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	login	67030052@kmitl.ac.th	null	2026-08-06 02:50:21.093916+00
ea5eba79-9841-4561-822b-53e37cd0ce55	a8fba782-0dc6-4c52-9a88-8436eee8d3df	login	admin@kmitl.ac.th	null	2026-08-06 03:01:26.667871+00
12bc2d89-e95a-439a-9183-8a86c16390e4	a8fba782-0dc6-4c52-9a88-8436eee8d3df	login	admin@kmitl.ac.th	null	2026-08-08 13:50:33.572806+00
6cc80d16-30ce-4824-82fb-f2d7624ca3cf	a8fba782-0dc6-4c52-9a88-8436eee8d3df	login	admin@kmitl.ac.th	null	2026-08-12 13:01:02.503601+00
9e12bc40-f43d-443d-91e7-fbcb0f31c9fd	ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	login	67030052@kmitl.ac.th	null	2026-08-12 13:01:29.063966+00
3f33acd5-d3e2-4971-ac82-aa6c2616af74	44753a57-ac4a-47fb-8d09-fcaac605a110	login	67030338@kmitl.ac.th	null	2026-08-12 13:26:32.401417+00
319e6b1d-4085-486f-9003-de522c3a9d4c	c9e9fb99-810e-4205-8937-6ad66757e1dc	login	67030037@kmitl.ac.th	null	2026-08-12 13:28:30.6628+00
ec83e1eb-8f9e-4437-a27f-c87e7c05840e	c9e9fb99-810e-4205-8937-6ad66757e1dc	connect_platform	67030037@kmitl.ac.th	{"platform": "google_classroom"}	2026-08-12 13:29:07.090653+00
091d5790-2aa7-42b1-99e5-404cbe46713b	44753a57-ac4a-47fb-8d09-fcaac605a110	connect_platform	67030338@kmitl.ac.th	{"platform": "google_classroom"}	2026-08-12 13:29:58.0078+00
52bcd2bb-ed46-4fbf-bf0a-76f410f67f98	c9e9fb99-810e-4205-8937-6ad66757e1dc	connect_platform	67030037@kmitl.ac.th	{"platform": "google_classroom"}	2026-08-12 13:30:06.259632+00
b6ac3521-984c-4fe6-8572-e58fa944f8b2	c9e9fb99-810e-4205-8937-6ad66757e1dc	connect_platform	67030037@kmitl.ac.th	{"platform": "google_classroom"}	2026-08-12 13:30:35.730271+00
30810851-6839-4ce4-a966-c8a581b34090	c9e9fb99-810e-4205-8937-6ad66757e1dc	login	67030037@kmitl.ac.th	null	2026-08-12 18:27:06.236167+00
fd6b186b-7b88-40a2-960b-453861050f2d	612bed31-f86b-40b4-8ac0-4efe1234e8d6	login	67030223@kmitl.ac.th	null	2026-08-12 18:31:48.89463+00
4bce7280-e26b-436d-a8bf-084007ba0b4f	612bed31-f86b-40b4-8ac0-4efe1234e8d6	connect_platform	67030223@kmitl.ac.th	{"platform": "google_classroom"}	2026-08-12 18:33:12.833692+00
02d0467e-0161-4e1e-af15-3898374375d6	612bed31-f86b-40b4-8ac0-4efe1234e8d6	connect_platform	67030223@kmitl.ac.th	{"platform": "google_classroom"}	2026-08-12 18:33:42.825534+00
f31bcbe6-f189-4d2a-9ee1-8b17cad37dcf	612bed31-f86b-40b4-8ac0-4efe1234e8d6	login	67030223@kmitl.ac.th	null	2026-08-13 01:07:25.910928+00
0bb69f3f-e5ab-493e-afc9-069abd91e8ec	ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	login	67030052@kmitl.ac.th	null	2026-08-13 01:31:14.226297+00
88080b1f-df7c-4554-b21d-65605a823809	a8fba782-0dc6-4c52-9a88-8436eee8d3df	login	admin@kmitl.ac.th	null	2026-08-13 01:32:53.364086+00
e5f0e972-d544-4863-9ce3-447d004fea05	a8fba782-0dc6-4c52-9a88-8436eee8d3df	login	admin@kmitl.ac.th	null	2026-08-13 01:33:41.131565+00
c49e7509-56f2-4783-b096-87d4ca49fb06	ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	login	67030052@kmitl.ac.th	null	2026-08-13 01:37:05.452725+00
de6ae5ac-c31a-49d6-ac6a-4f12a6f169e9	44753a57-ac4a-47fb-8d09-fcaac605a110	login	67030338@kmitl.ac.th	null	2026-08-13 01:42:38.279972+00
fa2000b7-a1bf-482f-aa64-70b86e3b68dd	ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	login	67030052@kmitl.ac.th	null	2026-08-13 01:53:37.907688+00
7b499267-57c5-4035-b862-086bc38e56bd	a8fba782-0dc6-4c52-9a88-8436eee8d3df	login	admin@kmitl.ac.th	null	2026-08-13 02:01:31.666741+00
e2a46d78-91c5-4f28-bf3f-265bd37f47e2	44753a57-ac4a-47fb-8d09-fcaac605a110	login	67030338@kmitl.ac.th	null	2026-08-13 02:08:21.231791+00
d30d7e49-03af-499f-9d2d-1c29a51891df	a8fba782-0dc6-4c52-9a88-8436eee8d3df	login	admin@kmitl.ac.th	null	2026-08-13 02:37:15.356507+00
2204750c-a299-402a-8cf4-980f70e3cb9d	ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	login	67030052@kmitl.ac.th	null	2026-08-13 02:37:27.139324+00
4a2134c8-5dd6-4f6f-a38f-a53fac078475	a8fba782-0dc6-4c52-9a88-8436eee8d3df	login	admin@kmitl.ac.th	null	2026-08-13 02:48:03.918574+00
a99f09df-8052-42d9-992a-c1525fdb944d	ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	login	67030052@kmitl.ac.th	null	2026-08-13 02:50:08.437474+00
a5e6971d-f4fd-419c-9679-ddda30e11ff1	ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	login	67030052@kmitl.ac.th	null	2026-08-13 02:50:13.626958+00
5074fc12-c771-42c1-ae1b-2cf6d984bee8	a8fba782-0dc6-4c52-9a88-8436eee8d3df	login	admin@kmitl.ac.th	null	2026-08-13 02:51:08.463807+00
6d9a3d41-2881-4896-83e8-83e898961711	a8fba782-0dc6-4c52-9a88-8436eee8d3df	connection_flag_stale	67030338@kmitl.ac.th	{"platform": "google"}	2026-08-13 02:51:49.635171+00
67894c08-edf7-419a-b115-ae4b9cdc47b8	ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	login	67030052@kmitl.ac.th	null	2026-08-13 03:51:49.922288+00
204f8705-76f9-47de-9df8-10486d65f937	44753a57-ac4a-47fb-8d09-fcaac605a110	login	67030338@kmitl.ac.th	null	2026-08-14 14:06:00.282652+00
8625008d-2ade-4dda-96b9-d2aa3abd79c2	44753a57-ac4a-47fb-8d09-fcaac605a110	login	67030338@kmitl.ac.th	null	2026-08-14 14:09:52.560257+00
\.


--

--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: postgres
--
--

COPY public.courses (id, user_id, platform_id, external_course_id, name, is_deleted, course_code, instructor_name, description) FROM stdin;
1cdb5559-2c07-4ba8-a246-7c983b7fe7c3	e27363ae-d793-41a8-89f9-6026f247c0bf	1	848330842820	ระบบศูนย์กลางการเรียนรู้ LMS PORTAL	f	\N	\N	\N
5c589519-69cc-4985-a593-ac2c5aa857a8	ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	1	868893388409	2569-IPL	f	\N	\N	\N
3b270e5f-2b48-4f11-b8bd-4f92ec56ed28	ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	1	841462031915	SENSORS AND TRANSDUCERS	f	\N	\N	\N
375d5756-0c87-4e23-a9d7-f9b54088c30e	44753a57-ac4a-47fb-8d09-fcaac605a110	1	868893388409	2569-IPL	f	\N	\N	\N
12eea155-c987-4ca5-b1d9-901f86bcdeff	44753a57-ac4a-47fb-8d09-fcaac605a110	1	841462031915	SENSORS AND TRANSDUCERS	f	\N	\N	\N
61e222f3-abc5-4457-aa3b-24f47eb358d9	c9e9fb99-810e-4205-8937-6ad66757e1dc	1	870252203369	03376123-FDDC-2026	f	\N	\N	\N
1c4ae749-7fa7-4010-a709-b15d792da4d2	c9e9fb99-810e-4205-8937-6ad66757e1dc	1	868893388409	2569-IPL	f	\N	\N	\N
cb4cec6b-01e4-49b8-b5b4-62dbebf9bdfd	c9e9fb99-810e-4205-8937-6ad66757e1dc	1	841462031915	SENSORS AND TRANSDUCERS	f	\N	\N	\N
a4b82211-470f-4a04-a68a-731aa8e044e1	612bed31-f86b-40b4-8ac0-4efe1234e8d6	1	870252203369	03376123-FDDC-2026	f	\N	\N	\N
ec54c5d6-ddb2-455b-acfe-9d04c3757792	612bed31-f86b-40b4-8ac0-4efe1234e8d6	1	868893388409	2569-IPL	f	\N	\N	\N
079910bb-2332-463f-b3f9-2356cc2557ef	612bed31-f86b-40b4-8ac0-4efe1234e8d6	1	841462031915	SENSORS AND TRANSDUCERS	f	\N	\N	\N
\.


--

--
-- Data for Name: notification_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--
--

COPY public.notification_rules (id, user_id, lead_time_minutes, sequence_order, is_enabled) FROM stdin;
\.


--

--
-- Data for Name: notification_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--
--

COPY public.notification_settings (id, user_id, new_assignment_enabled, due_soon_enabled, overdue_enabled, channel) FROM stdin;
\.


--

--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--
--

COPY public.notifications (id, user_id, assignment_id, type, status, retry_count, scheduled_at, delivered_at, notification_rule_id) FROM stdin;
\.


--

--
-- Data for Name: oauth_connections; Type: TABLE DATA; Schema: public; Owner: postgres
--
--

COPY public.oauth_connections (id, user_id, platform_id, access_token_enc, refresh_token_enc, token_expires_at, status, connected_at) FROM stdin;
2e53359f-0a05-4b4d-b2ee-b2c5a23c213a	ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	1	gAAAAABqYXcmMKDiDru7dH1laefJBssykve1W65lNfwEt6q_EfKfD64VJA1MHfKrwjOc2B3mVE4OoOhntmBbEMEPljE3Ksf4cynXEygyk7wMgdWoGvDuB977DUz4dt9APDgZ_M0o31wUNqNXRJuI7zs9ERaD14MRZ1FPFCS_BrgrCnmSPQECD5EBedvtZ5IdHJUaBN-QGKUA9YveXPy-3-gaPJgDdkEl9lh3zinKrG2fTy1oQ02IKgZ-9dI0fqfn20f2RaWZ_MnAqkc1ZHFcuBZQvSxnS9n2z4sonVsJYIOOTqpRcy1RMmVVwWzzl9FBtqDKIdA-GbGUBgslbxHlci7nkxJjHLSMJG1dCY1kDyafKxM6-57CmhACHwY1W-gBHco0z-m37TVnfTl40d0K4ZWg04VEeeJzXA==	gAAAAABqYXcmFNnTd73X_jkYgslWEN-OwDIA1WB0Odw4LFP8MoPjJgTv18QVQD-_v3OfcbpBsfbWQvdQkmMtBNloIXz3qgH6vNWQmdGv_s26MyasZvpJAayB3vgUMyFgyyR91mvsU1UQzwMDDhmSKxY3qb7xGxWm1yGo6lHSkv2py3_bSCjtWOU0bsdhpTi8Ud-_czSPnRLk3tIzogGlOl8G6wLD54GFYQ==	2026-07-23 03:06:29.207724+00	connected	2026-07-23 02:06:18.258275+00
97e89d6a-38a5-4f7a-bfcd-5713e770e14f	e27363ae-d793-41a8-89f9-6026f247c0bf	1	gAAAAABqYXSF2aDXgmHwMcLDmRpLGlmJgAEfMDcuYNKMIE6AC0f0oNyZTEEot9OhrkTIMyWdtTxj7q7QRoETlF5CFS0LqEy-2be7CUxECWQ5v7ImWF1ZLPUSHvc1mx8TdmZKeU-c1ZmWEdIK24eNCsEb4q6vVkeYAqlXBltan-gsaA9WCw4unGbq2o6iXxP240cuDtZ2HjI91SiRpPhHSoNTrGfvOosjLnv994GKs78qXkWPPuNbzN_Tr2whHf1b8H1bYCQwW16i47WabcCfhcXEC80bYAZad31T9nQWFMFv0VmSnNvH2oEwz_R_CbpGWUoVZSq7SRDeaAaPVcYb6kthID0_kvS9U11qiifMCeFrYK_ieRImwClSU-pyaAoYo75qBodS-n2iQHrCCVwiE_pYCOnF00J52A==	gAAAAABqYXSFTvH6vnJP8TGejn1PAg07y7NB0ktIJmYkB647aFsLAjuCEEla8AGZJPdi6IbgBKPnQ4TGXIvg4g3wialny0HgD7TKImP8zp_xh5RrQqzskfMDOSpMWgpLaMaNLIh8bJHBc966EIDBzymTxFypPWk7SPj1LSOvIQPO41sfr3lb2gmBwBH98ZKFvwtTAE-0WIxD1hOrb009R7vrYtYjOOA8Fg==	2026-07-23 02:55:16.321664+00	stale	2026-07-23 01:55:15.733969+00
e9e4107c-612d-4fc2-a01a-0498550b78ff	c9e9fb99-810e-4205-8937-6ad66757e1dc	1	gAAAAABqfHV6fp-ZPD3jGjJptBIl-X_VQKHoBL-BUVVIZOhgqXFi0pmLERUg017mJQNmewTM_MaR2KqKk4OjwdcJvkYbS-ORUT9dErzUNTQ9OEpG9Yr7M8OcYL95YJxJO1KqHi-_cd3cpvOfGMtG1SLiRqd04CCn7KIEkTKcfFWhs52XkK9Q01ZR2DdBdZ6L6zfLc_MGM8uKpWZiDSISqD79nT6WdBVb8Zf5CpKrAeb2ZF_l87k2-sxphI6w0fVjryb9vob3qTHRi9A1It4y72FtTYpzVuEl27y_JYoypIpS8aevroCKGzodRKd3YDI4AjUi5rwzWeY8cSZ5LyR6r1ofm1qCYQMGqR4eGyKHqXUdoNLElbs_XNeKElrro4wXvLg3P3wOT00bIk6TwaOOqs6JJhfQ68k-0w==	gAAAAABqfHV6tzVJVyLh-EgXxXiEBgRBvE3CnJMu5caHaQCvlIjwxP37k0LaV-hDgiJ1W4-Q5SDsrit7Z8k6WvShYHXcbKbb_5hK0aqztFNYMm4ad4112XzJhBHkqrvJaFJsqjojyJH6M4JClvesifCU5mrU2Y5HOlakyir8F-D1w-oAOgFYwAZkbRqsGjL-J7Cs6ecZp8P3y83NAGCKXcPPEafdD8b2_Q==	2026-08-12 14:30:33.347385+00	connected	2026-08-12 13:29:05.670925+00
afa69ef3-033b-42df-b7be-79c638725679	612bed31-f86b-40b4-8ac0-4efe1234e8d6	1	gAAAAABqfLyGyVl-Ls0bI9rflz8EG0_czLaMdDpKVnd8k0WQu67X1xTNSTqSxStgnUuVjnpAyCpMzIdPRF_KIqQvsuOYFC6Jay26pPrQ7Asza19UYDW99EYhiBdiuLzpP2jem3YiJ1EBK2pXYi8qz11ZCnUWYigc2A1MaPRZ9p9GOQYlVlvwVl7skWb0YBfIaISZhVhyqW8DKbD4quP-1G2dZmmW-klPWRry_ayJdb_ZkxEqjijugco9FarYsxJoPjQufy_ppg8XjrXFeGD-g54BsmEZoUGYWEQ_CM7yT2mJPdEHzevzadc3W3SDxYKZmgkCM2GBvaQuCCVXwdvb91B7AtsJga2OLLzz49AreRFdCoX1wrfCg9zW0bk_3fxvmsYrtkrLZdNu0ldm1kRKHp-eoD-FspeKog==	gAAAAABqfLyGQ5Bf1BlHvoektEmCNW0PZfe_I3b0HbTKXGSLc5HW0CNp05sbgcKKe9y4XeOeR6XnWbbMaZlpu3ksl-cs1nvEyTseT7m2MWzb7PewMgETw1lOBLpiSznGwhsp2FpfgY-r2sDoc34-9XhX15ih83K9JlkA6sRS0_PjLhREx-TXh43linPBy6flzDfR8UgkvyOiQbik_xO7LyHcYloQRs-hxg==	2026-08-12 19:33:41.614446+00	connected	2026-08-12 18:33:12.046103+00
f18b4057-7766-429c-80bd-6bd3184cf7c3	44753a57-ac4a-47fb-8d09-fcaac605a110	1	gAAAAABqfHVVrLG4adHEZm5AI5poPHcKx0n6e4DXv9kUVGjgGDHw8J1vx_z4BXxHKOKRVB8QR3l4Rrl2WLWEk6mhYlw-6lL5ajCVFBjpx_Bzlqd603oldWJBktNL-Pz2wACiXH_X93H_fEBxcANtZ5LffkyWChSjYP9kmx-7uqqe6us3rWM23hukmPn12T_ZiLxoH8CRc_Htpw4eqTxjj5tube-rVVlBzDyQq7GMBMcCq4nhca3OmK64Ua_pCcTcEaEG10YLe2f9xM4pfwMIF9_3n-AYdmbV-RICPDyArJP5hNn_lKCQsrFhQw4Ed7W8zWjKcp-rGRROIesHIKEXRARUfpEUiuwMxf7cWBjeZ1Vx1Zsv9Cn4Q_ZzeiqoLsYYu2yrcJxjSot0-Ho4fkFcHfNEVCb-cKFFaQ==	gAAAAABqfHVVR9J8w8Si7raHnANit05a5UYvNeYgPVdLgK6hJV9_HsOxHKProYPfv7NrHppmVzlImMxFBZcaVxSAaFWQkUetON8NW9ysPYNHadgk2Sg3zs5FZ6dBjKuYRN1zOO181NjFAS6G3UclVrOPLAVKUWyfBjebsWWdxK2fMKYYu1DopxGC2hir--i-Juu0MKzRUjT1g-knh9Hfq69zmYTl06iznw==	2026-08-12 14:29:56.040838+00	stale	2026-08-12 13:29:56.398447+00
\.


--

--
-- Data for Name: platforms; Type: TABLE DATA; Schema: public; Owner: postgres
--
--

COPY public.platforms (id, name) FROM stdin;
1	google_classroom
2	microsoft_teams
3	custom
\.


--

--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--
--

COPY public.roles (id, name) FROM stdin;
3	student
4	admin
\.


--

--
-- Data for Name: sync_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--
--

COPY public.sync_logs (id, user_id, platform_id, status, items_synced, error_detail, started_at, finished_at) FROM stdin;
d376eb76-9eef-4436-ba55-60a8d3e6b5e0	e27363ae-d793-41a8-89f9-6026f247c0bf	1	success	6	\N	2026-07-23 01:55:17.352266+00	2026-07-23 01:55:24.015697+00
36146a7a-fa44-4b6c-8b01-658be20011e5	ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	1	success	3	\N	2026-07-23 02:06:19.585605+00	2026-07-23 02:06:24.884457+00
4ed02bf5-dc53-4292-997f-bd5955a528ca	ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	1	success	3	\N	2026-07-23 02:06:30.218834+00	2026-07-23 02:06:36.429814+00
c9760d67-9838-4cdb-8bdf-62ec72fa76a3	c9e9fb99-810e-4205-8937-6ad66757e1dc	1	success	4	\N	2026-08-03 04:01:47.940495+00	2026-08-03 04:01:52.399594+00
dc1822f6-3925-497d-937c-9b75c2cd2466	c9e9fb99-810e-4205-8937-6ad66757e1dc	1	success	0	\N	2026-08-12 13:29:07.10454+00	2026-08-12 13:29:09.004559+00
a3126043-0fae-4595-9b2f-1678c74e90d1	44753a57-ac4a-47fb-8d09-fcaac605a110	1	success	4	\N	2026-08-12 13:29:57.995323+00	2026-08-12 13:30:03.417356+00
50e5d994-7deb-472b-9948-92b788bd76dc	c9e9fb99-810e-4205-8937-6ad66757e1dc	1	success	6	\N	2026-08-12 13:30:05.990401+00	2026-08-12 13:30:13.516238+00
6dbf9f24-a0ba-4088-b2b0-5cbc0b635e25	c9e9fb99-810e-4205-8937-6ad66757e1dc	1	success	6	\N	2026-08-12 13:30:35.448255+00	2026-08-12 13:30:42.322412+00
d3458a44-c859-4910-a156-ca281c0bb5f1	612bed31-f86b-40b4-8ac0-4efe1234e8d6	1	success	6	\N	2026-08-12 18:33:14.030278+00	2026-08-12 18:33:20.42189+00
113e8779-7f1f-421f-b088-f655ad15e5fa	612bed31-f86b-40b4-8ac0-4efe1234e8d6	1	success	6	\N	2026-08-12 18:33:44.717882+00	2026-08-12 18:33:51.678749+00
\.


--

--
-- Data for Name: user_assignment_status; Type: TABLE DATA; Schema: public; Owner: postgres
--
--

COPY public.user_assignment_status (id, user_id, assignment_id, is_read) FROM stdin;
\.


--

--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--
--

COPY public.user_roles (user_id, role_id) FROM stdin;
e27363ae-d793-41a8-89f9-6026f247c0bf	3
ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	3
c9e9fb99-810e-4205-8937-6ad66757e1dc	3
a8fba782-0dc6-4c52-9a88-8436eee8d3df	4
44753a57-ac4a-47fb-8d09-fcaac605a110	3
612bed31-f86b-40b4-8ac0-4efe1234e8d6	3
\.


--

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--
--

COPY public.users (id, email, password_hash, display_name, is_active, created_at, updated_at, password_reset_token, password_reset_expires_at) FROM stdin;
e27363ae-d793-41a8-89f9-6026f247c0bf	chayanggoon.s13@gmail.com	$2b$12$a3KC36U05gXBArv5DXUum.jxsWIcyi7MT/WLJxdqUvUHHY08IsBey	Chayanggoon Songphim	t	2026-07-22 03:40:32.127335+00	2026-07-22 03:40:32.127335+00	\N	\N
ab757724-cfeb-4ce2-ae6c-0a4d1d69effc	67030052@kmitl.ac.th	$2b$12$xbEyWCy7R/jGB8BUSzMjg.G/n2dwinV3qRV5LUOAkxtdICo8BuMvu	Chayanggoon Songphim	t	2026-07-22 06:01:34.436695+00	2026-07-22 06:01:34.436695+00	\N	\N
c9e9fb99-810e-4205-8937-6ad66757e1dc	67030037@kmitl.ac.th	$2b$12$T4s.qioucWOYxmCRNfjryeI22uhT.1iO.a25cyQxPB9obOGPC/lte	Reen	t	2026-07-23 02:00:05.673708+00	2026-07-23 02:00:05.673708+00	\N	\N
a8fba782-0dc6-4c52-9a88-8436eee8d3df	admin@kmitl.ac.th	$2b$12$tV0Aw23uaIC5hLJsw/FlNuxqRXr0pSlJIZkpvptvzpZlB0Z1YS7n.	System Administrator	t	2026-08-03 05:22:55.173829+00	2026-08-03 05:22:55.173829+00	\N	\N
44753a57-ac4a-47fb-8d09-fcaac605a110	67030338@kmitl.ac.th	$2b$12$O0IhWRBVbHmyiKj1m4n1TOnY25SBDN/dLGx1LsVH2D2LgIyKvwN/q	Rattapum Sornkeaw	t	2026-08-12 13:26:21.685566+00	2026-08-12 13:26:21.685566+00	\N	\N
612bed31-f86b-40b4-8ac0-4efe1234e8d6	67030223@kmitl.ac.th	$2b$12$UiPo0LygZdislIeSWJAf.ev18K1.aO0p7xHqnhcxJQ3OxdF1wSMca	Saranyapat	t	2026-08-12 18:31:44.535569+00	2026-08-12 18:31:44.535569+00	\N	\N
\.


--

--
-- Name: platforms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
--

SELECT pg_catalog.setval('public.platforms_id_seq', 3, true);


--

--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
--

SELECT pg_catalog.setval('public.roles_id_seq', 4, true);


--

--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--

--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--

--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--

--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--

--
-- Name: notification_rules notification_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.notification_rules
    ADD CONSTRAINT notification_rules_pkey PRIMARY KEY (id);


--

--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--

--
-- Name: notification_settings notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id);


--

--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--

--
-- Name: oauth_connections oauth_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.oauth_connections
    ADD CONSTRAINT oauth_connections_pkey PRIMARY KEY (id);


--

--
-- Name: platforms platforms_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.platforms
    ADD CONSTRAINT platforms_name_key UNIQUE (name);


--

--
-- Name: platforms platforms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.platforms
    ADD CONSTRAINT platforms_pkey PRIMARY KEY (id);


--

--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--

--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--

--
-- Name: sync_logs sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_pkey PRIMARY KEY (id);


--

--
-- Name: user_assignment_status uas_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.user_assignment_status
    ADD CONSTRAINT uas_unique UNIQUE (user_id, assignment_id);


--

--
-- Name: assignments uq_assignment_course_external; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT uq_assignment_course_external UNIQUE (course_id, external_assignment_id);


--

--
-- Name: courses uq_course_platform_external_user; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT uq_course_platform_external_user UNIQUE (platform_id, external_course_id, user_id);


--

--
-- Name: oauth_connections uq_oauth_user_platform; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.oauth_connections
    ADD CONSTRAINT uq_oauth_user_platform UNIQUE (user_id, platform_id);


--

--
-- Name: user_assignment_status user_assignment_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.user_assignment_status
    ADD CONSTRAINT user_assignment_status_pkey PRIMARY KEY (id);


--

--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--

--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--

--
-- Name: ix_assignments_computed_status; Type: INDEX; Schema: public; Owner: postgres
--
--

CREATE INDEX ix_assignments_computed_status ON public.assignments USING btree (computed_status);


--

--
-- Name: ix_assignments_due_at; Type: INDEX; Schema: public; Owner: postgres
--
--

CREATE INDEX ix_assignments_due_at ON public.assignments USING btree (due_at);


--

--
-- Name: ix_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--
--

CREATE INDEX ix_audit_logs_action ON public.audit_logs USING btree (action);


--

--
-- Name: ix_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--
--

CREATE INDEX ix_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--

--
-- Name: ix_notifications_scheduled_at; Type: INDEX; Schema: public; Owner: postgres
--
--

CREATE INDEX ix_notifications_scheduled_at ON public.notifications USING btree (scheduled_at);


--

--
-- Name: ix_notifications_status; Type: INDEX; Schema: public; Owner: postgres
--
--

CREATE INDEX ix_notifications_status ON public.notifications USING btree (status);


--

--
-- Name: ix_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--
--

CREATE INDEX ix_notifications_user_id ON public.notifications USING btree (user_id);


--

--
-- Name: ix_courses_user_id; Type: INDEX; Schema: public; Owner: postgres
--
--

CREATE INDEX ix_courses_user_id ON public.courses USING btree (user_id);


--

--
-- Name: ix_uas_user_id; Type: INDEX; Schema: public; Owner: postgres
--
--

CREATE INDEX ix_uas_user_id ON public.user_assignment_status USING btree (user_id);


--

--
-- Name: ix_uas_assignment_id; Type: INDEX; Schema: public; Owner: postgres
--
--

CREATE INDEX ix_uas_assignment_id ON public.user_assignment_status USING btree (assignment_id);


--

--
-- Name: ix_oauth_connections_user_id; Type: INDEX; Schema: public; Owner: postgres
--
--

CREATE INDEX ix_oauth_connections_user_id ON public.oauth_connections USING btree (user_id);


--

--
-- Name: ix_sync_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--
--

CREATE INDEX ix_sync_logs_user_id ON public.sync_logs USING btree (user_id);


--

--
-- Name: ix_password_recovery_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--
--

CREATE INDEX ix_password_recovery_tokens_user_id ON public.password_recovery_tokens USING btree (user_id);


--

--
-- Name: ix_password_recovery_tokens_token_hash; Type: INDEX; Schema: public; Owner: postgres
--
--

CREATE INDEX ix_password_recovery_tokens_token_hash ON public.password_recovery_tokens USING btree (token_hash);




--
-- Name: assignments assignments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--

--
-- Name: audit_logs audit_logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--

--
-- Name: courses courses_platform_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES public.platforms(id);


--

--
-- Name: courses courses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--

--
-- Name: notification_rules notification_rules_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.notification_rules
    ADD CONSTRAINT notification_rules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--

--
-- Name: notification_settings notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--

--
-- Name: notifications notifications_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);


--

--
-- Name: notifications notifications_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_rule_id_fkey FOREIGN KEY (notification_rule_id) REFERENCES public.notification_rules(id);


--

--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--

--
-- Name: oauth_connections oauth_connections_platform_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.oauth_connections
    ADD CONSTRAINT oauth_connections_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES public.platforms(id);


--

--
-- Name: oauth_connections oauth_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.oauth_connections
    ADD CONSTRAINT oauth_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--

--
-- Name: sync_logs sync_logs_platform_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES public.platforms(id);


--

--
-- Name: sync_logs sync_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--

--
-- Name: user_assignment_status uas_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.user_assignment_status
    ADD CONSTRAINT uas_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);


--

--
-- Name: user_assignment_status uas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.user_assignment_status
    ADD CONSTRAINT uas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--

--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--

--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--

--
-- Name: password_recovery_tokens password_recovery_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--
--

ALTER TABLE ONLY public.password_recovery_tokens
    ADD CONSTRAINT password_recovery_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--

--
-- Name: alembic_version; Type: ROW SECURITY; Schema: public; Owner: postgres
--
--

ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;

--

--
-- Name: assignments; Type: ROW SECURITY; Schema: public; Owner: postgres
--
--

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

--

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: postgres
--
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--

--
-- Name: notification_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--
--

ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

--

--
-- Name: notification_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--
--

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

--

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--

--
-- Name: oauth_connections; Type: ROW SECURITY; Schema: public; Owner: postgres
--
--

ALTER TABLE public.oauth_connections ENABLE ROW LEVEL SECURITY;

--

--
-- Name: platforms; Type: ROW SECURITY; Schema: public; Owner: postgres
--
--

ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;

--

--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--

--
-- Name: sync_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--
--

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

--

--
-- Name: user_assignment_status; Type: ROW SECURITY; Schema: public; Owner: postgres
--
--

ALTER TABLE public.user_assignment_status ENABLE ROW LEVEL SECURITY;

--

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--

-- End of KMAPS Neon restore
\unset ON_ERROR_STOP
