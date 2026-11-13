"""Create a Thai Word report automatically after every pytest run."""

from __future__ import annotations

import shutil
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest


_BANGKOK = ZoneInfo("Asia/Bangkok")
_ACTIVE_CONFIG: pytest.Config | None = None


def pytest_configure(config: pytest.Config) -> None:
    global _ACTIVE_CONFIG
    _ACTIVE_CONFIG = config
    config._backend_test_results = {}
    config._backend_test_started = time.monotonic()
    config._backend_test_start_time = datetime.now(_BANGKOK)


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo):
    outcome = yield
    report = outcome.get_result()
    results: dict = item.config._backend_test_results

    # A setup/teardown error must not be hidden by another phase's result.
    if report.failed:
        status = "ไม่ผ่าน"
    elif report.when == "call":
        if hasattr(report, "wasxfail"):
            status = "คาดหมายว่าจะไม่ผ่าน (XFAIL)"
        else:
            status = "ผ่าน" if report.passed else "ข้าม"
    elif report.skipped and report.when == "setup":
        status = "ข้าม"
    else:
        return

    current = results.get(item.nodeid)
    if current and current["status"] == "ไม่ผ่าน" and status != "ไม่ผ่าน":
        return

    results[item.nodeid] = {
        "name": item.nodeid,
        "status": status,
        "duration": float(report.duration),
        "details": str(report.longrepr) if report.failed else "",
    }


def pytest_collectreport(report: pytest.CollectReport) -> None:
    config = _ACTIVE_CONFIG
    if not report.failed:
        return
    # Collection errors are reported too, even when pytest cannot create items.
    if config is None:
        return
    config._backend_test_results[f"{report.nodeid} [เก็บกรณีทดสอบ]"] = {
        "name": f"{report.nodeid} [เก็บกรณีทดสอบ]",
        "status": "ผิดพลาดระหว่างเตรียมชุดทดสอบ",
        "duration": float(report.duration),
        "details": str(report.longrepr),
    }


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    """Write timestamped and latest reports without changing pytest's result."""
    config = session.config
    results = list(config._backend_test_results.values())
    started = config._backend_test_start_time
    finished = datetime.now(_BANGKOK)
    elapsed = max(0.0, time.monotonic() - config._backend_test_started)
    not_run = max(0, int(session.testscollected or 0) - len(results))
    report_dir = Path(__file__).resolve().parents[1] / "test-reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    stamp = finished.strftime("%Y%m%d_%H%M%S_%f")
    output = report_dir / f"Backend_API_Test_Report_{stamp}.docx"
    latest = report_dir / "Backend_API_Test_Report_Latest.docx"

    try:
        _write_word_report(
            output=output,
            results=results,
            collected=int(session.testscollected or 0),
            not_run=not_run,
            exitstatus=int(exitstatus),
            started=started,
            finished=finished,
            elapsed=elapsed,
            command=" ".join(sys.argv),
        )
        shutil.copy2(output, latest)
        print(f"\nรายงานผล Backend tests: {output}")
        print(f"สำเนารายงานล่าสุด: {latest}")
    except Exception as exc:  # A report failure must not hide the test exit status.
        fallback = output.with_suffix(".md")
        try:
            fallback.write_text(
                _markdown_fallback(results, collected, not_run, exitstatus, elapsed, exc),
                encoding="utf-8",
            )
            print(f"\nสร้างรายงาน Word ไม่สำเร็จ; บันทึกรายงานข้อความแทน: {fallback}")
        except Exception as fallback_exc:
            print(f"\nไม่สามารถสร้างรายงานผลทดสอบได้: {fallback_exc}")


def _write_word_report(
    *,
    output: Path,
    results: list[dict],
    collected: int,
    not_run: int,
    exitstatus: int,
    started: datetime,
    finished: datetime,
    elapsed: float,
    command: str,
) -> None:
    from docx import Document
    from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    from docx.shared import Inches, Pt, RGBColor

    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.65)
    section.bottom_margin = Inches(0.65)
    section.left_margin = Inches(0.7)
    section.right_margin = Inches(0.7)

    for style_name in ("Normal", "Title", "Heading 1", "Heading 2"):
        style = doc.styles[style_name]
        style.font.name = "TH Sarabun New"
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "TH Sarabun New")
    doc.styles["Normal"].font.size = Pt(13)
    doc.styles["Title"].font.size = Pt(24)
    doc.styles["Title"].font.bold = True
    doc.styles["Title"].font.color.rgb = RGBColor(58, 39, 91)
    doc.styles["Heading 1"].font.size = Pt(18)
    doc.styles["Heading 1"].font.bold = True
    doc.styles["Heading 1"].font.color.rgb = RGBColor(58, 39, 91)

    def fill(cell, color: str) -> None:
        shading = OxmlElement("w:shd")
        shading.set(qn("w:fill"), color)
        cell._tc.get_or_add_tcPr().append(shading)

    def cell_text(cell, value: str, *, bold: bool = False, white: bool = False) -> None:
        cell.text = ""
        paragraph = cell.paragraphs[0]
        paragraph.paragraph_format.space_after = Pt(0)
        run = paragraph.add_run(value)
        run.bold = bold
        run.font.name = "TH Sarabun New"
        run._element.rPr.rFonts.set(qn("w:eastAsia"), "TH Sarabun New")
        run.font.size = Pt(11)
        if white:
            run.font.color.rgb = RGBColor(255, 255, 255)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER

    def add_table(headers: list[str], rows: list[list[str]]) -> None:
        table = doc.add_table(rows=1, cols=len(headers))
        table.style = "Table Grid"
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        for index, header in enumerate(headers):
            cell_text(table.rows[0].cells[index], header, bold=True, white=True)
            fill(table.rows[0].cells[index], "3A275B")
        for row_index, row in enumerate(rows):
            cells = table.add_row().cells
            for index, value in enumerate(row):
                cell_text(cells[index], value)
                if row_index % 2:
                    fill(cells[index], "F3F1F7")
        doc.add_paragraph().paragraph_format.space_after = Pt(1)

    counts = {
        status: sum(1 for result in results if result["status"] == status)
        for status in (
            "ผ่าน", "ไม่ผ่าน", "ข้าม", "คาดหมายว่าจะไม่ผ่าน (XFAIL)",
            "ผิดพลาดระหว่างเตรียมชุดทดสอบ",
        )
    }
    title = doc.add_paragraph(style="Title")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.add_run("รายงานผลการทดสอบ Backend API")
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.add_run("MultiPlatform Assignment Tracking and Notification System (KMAPS)")

    add_table(
        ["รายการ", "ผลการรัน"],
        [
            ["เริ่มทดสอบ", started.strftime("%d/%m/%Y %H:%M:%S %Z")],
            ["สิ้นสุด", finished.strftime("%d/%m/%Y %H:%M:%S %Z")],
            ["เวลารวม", f"{elapsed:.2f} วินาที"],
            ["กรณีที่เก็บได้จาก pytest", str(collected)],
            ["ผ่าน", str(counts["ผ่าน"])],
            ["ไม่ผ่าน", str(counts["ไม่ผ่าน"])],
            ["ข้าม", str(counts["ข้าม"])],
            ["XFAIL", str(counts["คาดหมายว่าจะไม่ผ่าน (XFAIL)"])],
            ["ผิดพลาดตอนเก็บกรณีทดสอบ", str(counts["ผิดพลาดระหว่างเตรียมชุดทดสอบ"])],
            ["ยังไม่ได้เริ่มรัน", str(not_run)],
            ["รหัสจบของ pytest", str(exitstatus)],
        ],
    )

    doc.add_heading("รายการกรณีทดสอบ", level=1)
    rows = [
        [str(index), result["name"], result["status"], f"{result['duration']:.2f}"]
        for index, result in enumerate(results, 1)
    ]
    if not rows:
        rows = [["—", "ไม่มีกรณีทดสอบที่เริ่มทำงาน", "ยังไม่มีผล", "0.00"]]
    add_table(["ลำดับ", "กรณีทดสอบ", "ผล", "วินาที"], rows)

    failures = [result for result in results if result["details"]]
    if failures:
        doc.add_heading("รายละเอียดกรณีที่มีข้อผิดพลาด", level=1)
        for result in failures:
            doc.add_heading(f"{result['status']}: {result['name']}", level=2)
            details = result["details"][:7000]
            paragraph = doc.add_paragraph(details)
            paragraph.paragraph_format.space_after = Pt(5)

    doc.add_heading("คำสั่งที่ใช้", level=1)
    doc.add_paragraph(command)
    doc.add_paragraph(
        "รายงานนี้สร้างจากผลจริงของ pytest สำหรับการรันครั้งนี้ "
        "ผลของการรันก่อนหน้าไม่ได้ถูกรวมเข้ากับรายงานนี้."
    )

    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = footer.add_run("KMAPS · Backend API Test Report")
    run.font.name = "TH Sarabun New"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "TH Sarabun New")
    run.font.size = Pt(10)
    doc.save(output)


def _markdown_fallback(
    results: list[dict], collected: int, not_run: int, exitstatus: int,
    elapsed: float, error: Exception,
) -> str:
    lines = [
        "# รายงานผลการทดสอบ Backend API",
        "",
        f"- เวลา: {datetime.now(_BANGKOK).isoformat(timespec='seconds')}",
        f"- เก็บกรณีทดสอบได้: {collected}",
        f"- ผ่าน: {sum(r['status'] == 'ผ่าน' for r in results)}",
        f"- ไม่ผ่าน: {sum(r['status'] == 'ไม่ผ่าน' for r in results)}",
        f"- ยังไม่ได้เริ่มรัน: {not_run}",
        f"- เวลารวม: {elapsed:.2f} วินาที; pytest exit code: {exitstatus}",
        f"- สาเหตุที่สร้าง Word ไม่สำเร็จ: {error}",
        "",
        "## รายการกรณีทดสอบ",
        "",
        "| กรณีทดสอบ | ผล | วินาที |",
        "|---|---:|---:|",
    ]
    lines.extend(
        f"| {r['name'].replace('|', '/')} | {r['status']} | {r['duration']:.2f} |"
        for r in results
    )
    return "\n".join(lines) + "\n"
