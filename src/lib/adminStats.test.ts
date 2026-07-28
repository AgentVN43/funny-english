import { describe, expect, it } from "vitest";
import {
  EMPTY_TOTALS,
  groupSessionsByTopic,
  groupSessionsByUser,
  percentOf,
  sessionsWithin,
  startOfRange,
  totalsFor,
} from "./adminStats";
import type { StudySession } from "./types";

/** Test chạy ở múi Asia/Ho_Chi_Minh: 13:05Z = 20:05 giờ Việt Nam */
function session(
  overrides: Partial<StudySession> & { started_at: string }
): StudySession {
  return {
    id: overrides.started_at + (overrides.topic_name ?? ""),
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

describe("percentOf", () => {
  it("làm tròn về số nguyên", () => {
    expect(percentOf(30, 40)).toBe(75);
    expect(percentOf(1, 3)).toBe(33);
  });

  it("không chia cho 0", () => {
    expect(percentOf(0, 0)).toBe(0);
  });
});

describe("totalsFor", () => {
  it("cộng đúng ví dụ khách đưa", () => {
    const totals = totalsFor([
      session({
        started_at: "2026-07-27T13:05:00Z",
        ended_at: "2026-07-27T14:00:00Z",
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

    expect(totals.sessionCount).toBe(2);
    expect(totals.totalQuestions).toBe(90);
    expect(totals.totalCorrect).toBe(65);
    expect(totals.minutes).toBe(80);
    expect(totals.activeDays).toBe(1);
    expect(totals.lastStudiedAt).toBe("2026-07-27T14:10:00Z");
  });

  it("đếm số ngày có học, không phải số buổi", () => {
    const totals = totalsFor([
      session({ started_at: "2026-07-25T13:00:00Z" }),
      session({ started_at: "2026-07-25T15:00:00Z" }),
      session({ started_at: "2026-07-27T13:00:00Z" }),
    ]);
    expect(totals.sessionCount).toBe(3);
    expect(totals.activeDays).toBe(2);
  });

  it("lấy buổi mới nhất kể cả khi danh sách chưa sắp xếp", () => {
    const totals = totalsFor([
      session({ started_at: "2026-07-25T13:00:00Z" }),
      session({ started_at: "2026-07-27T13:00:00Z" }),
      session({ started_at: "2026-07-26T13:00:00Z" }),
    ]);
    expect(totals.lastStudiedAt).toBe("2026-07-27T13:00:00Z");
  });

  it("học viên chưa học buổi nào trả về số 0", () => {
    expect(totalsFor([])).toEqual(EMPTY_TOTALS);
  });
});

describe("groupSessionsByTopic", () => {
  it("gộp nhiều buổi cùng chủ đề thành một dòng", () => {
    const stats = groupSessionsByTopic([
      session({
        started_at: "2026-07-25T13:00:00Z",
        ended_at: "2026-07-25T13:20:00Z",
        topic_id: "fruit",
        topic_name: "Trái cây",
        total_questions: 20,
        correct_count: 12,
      }),
      session({
        started_at: "2026-07-27T13:00:00Z",
        ended_at: "2026-07-27T13:30:00Z",
        topic_id: "fruit",
        topic_name: "Trái cây",
        total_questions: 20,
        correct_count: 18,
      }),
    ]);

    expect(stats).toHaveLength(1);
    expect(stats[0].sessionCount).toBe(2);
    expect(stats[0].totalQuestions).toBe(40);
    expect(stats[0].totalCorrect).toBe(30);
    expect(stats[0].minutes).toBe(50);
    expect(stats[0].lastStudiedAt).toBe("2026-07-27T13:00:00Z");
  });

  it("chủ đề làm nhiều câu nhất xếp trước", () => {
    const stats = groupSessionsByTopic([
      session({
        started_at: "2026-07-27T13:00:00Z",
        topic_id: "fruit",
        topic_name: "Trái cây",
        total_questions: 40,
      }),
      session({
        started_at: "2026-07-27T14:00:00Z",
        topic_id: "animal",
        topic_name: "Con vật",
        total_questions: 50,
      }),
    ]);
    expect(stats.map((s) => s.topicName)).toEqual(["Con vật", "Trái cây"]);
  });

  it("hai chủ đề trùng tên vẫn tách riêng theo id", () => {
    const stats = groupSessionsByTopic([
      session({
        started_at: "2026-07-27T13:00:00Z",
        topic_id: "a",
        topic_name: "Trái cây",
      }),
      session({
        started_at: "2026-07-27T14:00:00Z",
        topic_id: "b",
        topic_name: "Trái cây",
      }),
    ]);
    expect(stats).toHaveLength(2);
  });

  it("chủ đề đã xoá vẫn hiện, gộp theo tên đã chụp lại", () => {
    const stats = groupSessionsByTopic([
      session({
        started_at: "2026-07-25T13:00:00Z",
        topic_id: null,
        topic_name: "Trái cây",
      }),
      session({
        started_at: "2026-07-27T13:00:00Z",
        topic_id: null,
        topic_name: "Trái cây",
      }),
    ]);
    expect(stats).toHaveLength(1);
    expect(stats[0].sessionCount).toBe(2);
  });

  it("mất cả id lẫn tên thì vẫn có nhãn đọc được", () => {
    const stats = groupSessionsByTopic([
      session({
        started_at: "2026-07-27T13:00:00Z",
        topic_id: null,
        topic_name: "",
      }),
    ]);
    expect(stats[0].topicName).toBe("Chủ đề đã xoá");
  });

  it("danh sách rỗng trả về rỗng", () => {
    expect(groupSessionsByTopic([])).toEqual([]);
  });
});

describe("groupSessionsByUser", () => {
  it("chia đúng về từng học viên", () => {
    const byUser = groupSessionsByUser([
      session({ started_at: "2026-07-27T13:00:00Z", user_id: "a" }),
      session({ started_at: "2026-07-27T14:00:00Z", user_id: "b" }),
      session({ started_at: "2026-07-27T15:00:00Z", user_id: "a" }),
    ]);
    expect(byUser.get("a")).toHaveLength(2);
    expect(byUser.get("b")).toHaveLength(1);
    expect(byUser.get("c")).toBeUndefined();
  });
});

describe("sessionsWithin", () => {
  // Mốc "bây giờ": 20:00 ngày 27/07 giờ Việt Nam
  const now = new Date("2026-07-27T13:00:00Z");

  it("7 ngày gần đây bắt đầu từ 00:00 ngày thứ 7 tính ngược lại", () => {
    // 21/07 00:00 giờ VN = 20/07 17:00Z
    expect(startOfRange(7, now).toISOString()).toBe("2026-07-20T17:00:00.000Z");
  });

  it("giữ buổi học đầu ngày thứ 7, bỏ buổi ngay trước đó", () => {
    const kept = session({ started_at: "2026-07-20T17:30:00Z" }); // 00:30 ngày 21/07
    const dropped = session({ started_at: "2026-07-20T16:30:00Z" }); // 23:30 ngày 20/07
    const result = sessionsWithin([kept, dropped], 7, now);
    expect(result).toEqual([kept]);
  });

  it("buổi học tối nay vẫn nằm trong khoảng", () => {
    const tonight = session({ started_at: "2026-07-27T12:30:00Z" });
    expect(sessionsWithin([tonight], 7, now)).toEqual([tonight]);
  });

  it("days <= 0 nghĩa là xem tất cả", () => {
    const old = session({ started_at: "2020-01-01T00:00:00Z" });
    expect(sessionsWithin([old], 0, now)).toEqual([old]);
  });

  it("không sửa mảng đầu vào", () => {
    const input = [
      session({ started_at: "2026-07-27T12:00:00Z" }),
      session({ started_at: "2020-01-01T00:00:00Z" }),
    ];
    sessionsWithin(input, 7, now);
    expect(input).toHaveLength(2);
  });
});
