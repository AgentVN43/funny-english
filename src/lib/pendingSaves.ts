/** Một câu trả lời chưa ghi được lên server */
export interface PendingAnswer {
  cardId: string;
  correct: boolean;
}

/** Hàm ghi một câu trả lời lên server; ném lỗi nếu thất bại */
export type SaveFn = (item: PendingAnswer) => Promise<void>;

/**
 * Hàng chờ các câu trả lời chưa lưu được (mất mạng, lỗi server).
 *
 * Trước đây lỗi lưu bị nuốt im lặng: học viên làm xong cả phiên mà không có
 * câu nào vào Tiến độ, và không ai biết. Hàng chờ này giữ lại để thử lưu lại
 * và để giao diện báo cho người dùng.
 */
export class PendingSaveQueue {
  private items: PendingAnswer[] = [];
  private flushing = false;

  get size(): number {
    return this.items.length;
  }

  /** Bản sao dùng để kiểm tra/hiển thị, không sửa được hàng chờ thật */
  snapshot(): PendingAnswer[] {
    return [...this.items];
  }

  add(item: PendingAnswer): void {
    this.items.push(item);
  }

  /**
   * Thử lưu lại toàn bộ hàng chờ. Câu nào vẫn lỗi thì giữ lại cho lần sau,
   * theo đúng thứ tự trả lời ban đầu.
   *
   * An toàn khi có câu trả lời mới rơi vào hàng chờ trong lúc đang chạy —
   * câu mới không bị mất và không bị thử lại hai lần. Gọi chồng lên nhau
   * trong lúc đang chạy thì lần gọi sau bỏ qua.
   *
   * @returns số câu vẫn chưa lưu được sau khi thử
   */
  async flush(save: SaveFn): Promise<number> {
    if (this.flushing) return this.items.length;
    this.flushing = true;
    try {
      const batch = this.items;
      this.items = [];
      const stillFailing: PendingAnswer[] = [];
      for (const item of batch) {
        try {
          await save(item);
        } catch {
          stillFailing.push(item);
        }
      }
      // Câu lỗi cũ đứng trước câu mới rơi vào trong lúc đang chạy
      this.items = [...stillFailing, ...this.items];
      return this.items.length;
    } finally {
      this.flushing = false;
    }
  }

  clear(): void {
    this.items = [];
  }
}
