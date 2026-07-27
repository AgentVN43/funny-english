import { describe, expect, it } from "vitest";
import {
  dayKey,
  durationMinutes,
  formatClock,
  formatDayLabel,
  formatDuration,
  formatTimeRange,
  groupSessionsByDay,
} from "./history";
import type { StudySession } from "./types";

/**
 * Test chạy ở múi Asia/Ho_Chi_Minh (đặt trong vitest.config.ts),
 * nên 13:05Z tương ứng 20:05 giờ Việt Nam — đúng ví dụ khách đưa.
 */
function session(
  overrides: Partial<StudySession> & { started_at: string }
): StudySession {
  return {
    id: overrides.started_at,
    user_id: "u1",
    topic_id: "t1",
    topic_name: "Chủ đề",
    total_questions: 40,
    correct_count: 30,
    wrong_count: 10,
    ended_at: overrides.started_at,
    created_at: overrides.started_at,
    ...overrides,
  };
}

describe("định dạng ngày giờ", () => {
  it("hiển thị giờ địa phương, không phải UTC", () => {
    expect(formatClock("2026-07-27T13:05:00Z")).toBe("20:05");
  });

  it("đệm số 0 cho giờ và phút", () => {
    expect(formatClock("2026-07-27T01:03:00Z")).toBe("08:03");
  });

  it("nhãn ngày dạng DD/MM/YYYY", () => {
    expect(formatDayLabel("2026-07-27T13:05:00Z")).toBe("27/07/2026");
  });

  it("khoảng thời gian đúng ví dụ khách đưa", () => {
    expect(
      formatTimeRange("2026-07-27T13:05:00Z", "2026-07-27T14:00:00Z")
    ).toBe("20:05 – 21:00");
  });

  it("buổi học khuya vẫn thuộc ngày hôm đó theo giờ Việt Nam", () => {
    // 16:30Z = 23:30 ngày 27/07 giờ VN, không được nhảy sang 28/07
    expect(dayKey("2026-07-27T16:30:00Z")).toBe("2026-07-27");
  });

  it("qua nửa đêm giờ Việt Nam thì sang ngày mới", () => {
    // 17:30Z = 00:30 ngày 28/07 giờ VN
    expect(dayKey("2026-07-27T17:30:00Z")).toBe("2026-07-28");
  });
});

describe("durationMinutes", () => {
  it("tính đúng số phút", () => {
    expect(
      durationMinutes("2026-07-27T13:05:00Z", "2026-07-27T13:48:00Z")
    ).toBe(43);
  });

  it("làm tròn về phút gần nhất", () => {
    expect(
      durationMinutes("2026-07-27T13:00:00Z", "2026-07-27T13:00:40Z")
    ).toBe(1);
  });

  it("cùng thời điểm thì bằng 0", () => {
    const t = "2026-07-27T13:00:00Z";
    expect(durationMinutes(t, t)).toBe(0);
  });

  it("kết thúc trước bắt đầu thì trả 0, không ra số âm", () => {
    expect(
      durationMinutes("2026-07-27T14:00:00Z", "2026-07-27T13:00:00Z")
    ).toBe(0);
  });

  it("ngày giờ hỏng thì trả 0", () => {
    expect(durationMinutes("không phải ngày", "cũng không")).toBe(0);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "dưới 1 phút"],
    [1, "1 phút"],
    [43, "43 phút"],
    [59, "59 phút"],
    [60, "1 giờ"],
    [75, "1 giờ 15 phút"],
    [120, "2 giờ"],
    [135, "2 giờ 15 phút"],
  ])("%i phút -> %s", (mins, expected) => {
    expect(formatDuration(mins)).toBe(expected);
  });
});

describe("groupSessionsByDay", () => {
  it("gom đúng ví dụ khách đưa", () => {
    const days = groupSessionsByDay([
      session({
        started_at: "2026-07-27T13:05:00Z",
        ended_at: "2026-07-27T13:48:00Z",
        topic_name: "Trái cây",
        total_questions: 40,
        correct_count: 30,
        wrong_count: 10,
      }),
      session({
        started_at: "2026-07-27T14:10:00Z",
        ended_at: "2026-07-27T14:35:00Z",
        topic_name: "Con vật",
        total_questions: 50,
        correct_count: 35,
        wrong_count: 15,
      }),
    ]);

    expect(days).toHaveLength(1);
    expect(days[0].label).toBe("27/07/2026");
    expect(days[0].totalQuestions).toBe(90);
    expect(days[0].totalCorrect).toBe(65);
    expect(days[0].minutes).toBe(68);
    // Buổi mới nhất lên đầu
    expect(days[0].sessions.map((s) => s.topic_name)).toEqual([
      "Con vật",
      "Trái cây",
    ]);
  });

  it("ngày mới nhất xếp trước", () => {
    const days = groupSessionsByDay([
      session({ started_at: "2026-07-25T13:00:00Z" }),
      session({ started_at: "2026-07-27T13:00:00Z" }),
      session({ started_at: "2026-07-26T13:00:00Z" }),
    ]);
    expect(days.map((d) => d.label)).toEqual([
      "27/07/2026",
      "26/07/2026",
      "25/07/2026",
    ]);
  });

  it("nhiều buổi cùng chủ đề trong một ngày đều được giữ", () => {
    const days = groupSessionsByDay([
      session({ started_at: "2026-07-27T13:00:00Z", topic_name: "Trái cây" }),
      session({ started_at: "2026-07-27T15:00:00Z", topic_name: "Trái cây" }),
    ]);
    expect(days).toHaveLength(1);
    expect(days[0].sessions).toHaveLength(2);
  });

  it("buổi bỏ dở vẫn tính đúng, không cần dữ liệu đặc biệt", () => {
    const days = groupSessionsByDay([
      session({
        started_at: "2026-07-27T13:00:00Z",
        ended_at: "2026-07-27T13:05:00Z",
        total_questions: 3,
        correct_count: 2,
        wrong_count: 1,
      }),
    ]);
    expect(days[0].totalQuestions).toBe(3);
    expect(days[0].minutes).toBe(5);
  });

  it("danh sách rỗng trả về rỗng", () => {
    expect(groupSessionsByDay([])).toEqual([]);
  });

  it("không sửa mảng đầu vào", () => {
    const input = [
      session({ started_at: "2026-07-27T13:00:00Z", topic_name: "A" }),
      session({ started_at: "2026-07-27T15:00:00Z", topic_name: "B" }),
    ];
    groupSessionsByDay(input);
    expect(input.map((s) => s.topic_name)).toEqual(["A", "B"]);
  });
});
