import { describe, expect, it, vi } from "vitest";
import { PendingSaveQueue } from "./pendingSaves";
import type { PendingAnswer } from "./pendingSaves";

const answer = (cardId: string, correct = true): PendingAnswer => ({
  cardId,
  correct,
});

describe("PendingSaveQueue", () => {
  it("hàng chờ mới thì rỗng", () => {
    expect(new PendingSaveQueue().size).toBe(0);
  });

  it("đếm đúng số câu đang chờ", () => {
    const q = new PendingSaveQueue();
    q.add(answer("a"));
    q.add(answer("b"));
    expect(q.size).toBe(2);
  });

  it("lưu lại thành công thì hàng chờ trống", async () => {
    const q = new PendingSaveQueue();
    q.add(answer("a"));
    q.add(answer("b"));
    const save = vi.fn().mockResolvedValue(undefined);

    const remaining = await q.flush(save);

    expect(remaining).toBe(0);
    expect(q.size).toBe(0);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("giữ lại đúng những câu vẫn lỗi", async () => {
    const q = new PendingSaveQueue();
    q.add(answer("a"));
    q.add(answer("b"));
    q.add(answer("c"));
    const save = vi.fn(async (item: PendingAnswer) => {
      if (item.cardId === "b") throw new Error("mất mạng");
    });

    const remaining = await q.flush(save);

    expect(remaining).toBe(1);
    expect(q.snapshot()).toEqual([answer("b")]);
  });

  it("giữ nguyên thứ tự trả lời của các câu lỗi", async () => {
    const q = new PendingSaveQueue();
    ["a", "b", "c", "d"].forEach((id) => q.add(answer(id)));
    const save = vi.fn(async (item: PendingAnswer) => {
      if (item.cardId !== "c") throw new Error("mất mạng");
    });

    await q.flush(save);

    expect(q.snapshot().map((i) => i.cardId)).toEqual(["a", "b", "d"]);
  });

  it("không mất câu trả lời mới rơi vào lúc đang lưu lại", async () => {
    const q = new PendingSaveQueue();
    q.add(answer("cũ"));
    const save = vi.fn(async () => {
      // Học viên trả lời câu tiếp theo trong lúc đang thử lưu lại
      q.add(answer("mới"));
      throw new Error("mất mạng");
    });

    const remaining = await q.flush(save);

    expect(remaining).toBe(2);
    expect(q.snapshot().map((i) => i.cardId)).toEqual(["cũ", "mới"]);
  });

  it("không thử lại hai lần câu vừa rơi vào lúc đang lưu", async () => {
    const q = new PendingSaveQueue();
    q.add(answer("cũ"));
    const seen: string[] = [];
    const save = vi.fn(async (item: PendingAnswer) => {
      seen.push(item.cardId);
      if (item.cardId === "cũ") q.add(answer("mới"));
      throw new Error("mất mạng");
    });

    await q.flush(save);

    expect(seen).toEqual(["cũ"]);
  });

  it("gọi flush chồng lên nhau không lưu trùng", async () => {
    const q = new PendingSaveQueue();
    q.add(answer("a"));
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const save = vi.fn(async () => {
      await gate;
    });

    const first = q.flush(save);
    const second = q.flush(save); // chạy khi lần đầu chưa xong
    release();
    await Promise.all([first, second]);

    expect(save).toHaveBeenCalledTimes(1);
    expect(q.size).toBe(0);
  });

  it("flush hàng chờ rỗng không gọi save", async () => {
    const q = new PendingSaveQueue();
    const save = vi.fn().mockResolvedValue(undefined);
    expect(await q.flush(save)).toBe(0);
    expect(save).not.toHaveBeenCalled();
  });

  it("lưu lại thành công ở lần thử thứ hai", async () => {
    const q = new PendingSaveQueue();
    q.add(answer("a"));
    let online = false;
    const save = vi.fn(async () => {
      if (!online) throw new Error("mất mạng");
    });

    expect(await q.flush(save)).toBe(1);
    online = true;
    expect(await q.flush(save)).toBe(0);
    expect(q.size).toBe(0);
  });

  it("snapshot không sửa được hàng chờ thật", () => {
    const q = new PendingSaveQueue();
    q.add(answer("a"));
    q.snapshot().push(answer("giả"));
    expect(q.size).toBe(1);
  });

  it("save ném lỗi đồng bộ vẫn được giữ lại, không làm vỡ flush", async () => {
    const q = new PendingSaveQueue();
    q.add(answer("a"));
    const save = () => {
      throw new Error("lỗi đồng bộ");
    };

    await expect(q.flush(save as never)).resolves.toBe(1);
    expect(q.size).toBe(1);
  });

  it("giữ đúng giá trị đúng/sai của câu trả lời", async () => {
    const q = new PendingSaveQueue();
    q.add(answer("a", false));
    const save = vi.fn(async () => {
      throw new Error("mất mạng");
    });
    await q.flush(save);
    expect(q.snapshot()[0]).toEqual({ cardId: "a", correct: false });
  });

  it("clear xoá sạch hàng chờ", () => {
    const q = new PendingSaveQueue();
    q.add(answer("a"));
    q.clear();
    expect(q.size).toBe(0);
  });
});
