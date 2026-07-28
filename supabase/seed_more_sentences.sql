-- Thêm 4 chủ đề mẫu câu giao tiếp, mỗi chủ đề 30 câu: sân bay, khách sạn,
-- khám bệnh, gọi điện thoại.
--
-- Bổ sung cho seed_demo_content.sql chứ không thay thế. Chạy được độc lập:
-- nhóm "Tiếng anh giao tiếp hàng ngày" nếu chưa có sẽ được tạo.
--
-- Chủ đề "gọi điện thoại" cố tình đặt question_prompt riêng để nghe thử phần
-- ghi đè câu hỏi — ba chủ đề còn lại để trống, tức đọc thẳng câu tiếng Việt.
--
-- AN TOÀN CHẠY LẠI NHIỀU LẦN (idempotent): chủ đề đối chiếu theo tên, thẻ đối
-- chiếu theo (chủ đề, câu tiếng Anh).
--
-- CHẠY SAU migration_question_modes.sql.

-- ========================================================
-- NHÓM (tạo nếu chưa có)
-- ========================================================
INSERT INTO public.categories (name, description)
SELECT 'Tiếng anh giao tiếp hàng ngày', 'Mẫu câu dùng ngoài đời thật'
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE name = 'Tiếng anh giao tiếp hàng ngày'
);

-- ========================================================
-- CHỦ ĐỀ
-- ========================================================
INSERT INTO public.topics (category_id, name, description, mode, question_prompt)
SELECT c.id, v.name, v.description, 'sentence', v.prompt
FROM (VALUES
  ('30 câu tiếng anh ở sân bay', 'Làm thủ tục, lên máy bay, lấy hành lý', ''),
  ('30 câu tiếng anh ở khách sạn', 'Nhận phòng, yêu cầu, trả phòng', ''),
  ('30 câu tiếng anh đi khám bệnh', 'Kể triệu chứng và nghe dặn dò', ''),
  ('30 câu tiếng anh gọi điện thoại', 'Nghe gọi, nhắn lại, hẹn giờ', 'Câu này nói bằng tiếng Anh thế nào? {tu}')
) AS v(name, description, prompt)
JOIN public.categories c ON c.name = 'Tiếng anh giao tiếp hàng ngày'
WHERE NOT EXISTS (
  SELECT 1 FROM public.topics t WHERE t.name = v.name
);

-- ========================================================
-- THẺ
-- ========================================================

-- ---------- 30 câu tiếng anh ở sân bay ----------
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT t.id, v.word, v.vi, ''
FROM public.topics t
JOIN (VALUES
  ('Where is the check-in desk?', 'Quầy làm thủ tục ở đâu ạ?'),
  ('Here is my passport.', 'Hộ chiếu của tôi đây ạ.'),
  ('I have one suitcase.', 'Tôi có một cái va li.'),
  ('Can I take this as hand luggage?', 'Cái này xách tay được không ạ?'),
  ('My bag is too heavy.', 'Túi của tôi nặng quá.'),
  ('Is the flight on time?', 'Chuyến bay có đúng giờ không ạ?'),
  ('The flight is delayed by one hour.', 'Chuyến bay bị hoãn một tiếng.'),
  ('Which gate is it?', 'Cửa ra máy bay số mấy ạ?'),
  ('Where is gate number twelve?', 'Cửa số mười hai ở đâu ạ?'),
  ('What time do we board?', 'Mấy giờ thì lên máy bay ạ?'),
  ('May I have a window seat?', 'Cho tôi chỗ ngồi cạnh cửa sổ được không?'),
  ('I would prefer an aisle seat.', 'Tôi muốn ngồi ghế cạnh lối đi.'),
  ('Where is the security check?', 'Khu kiểm tra an ninh ở đâu ạ?'),
  ('Please take off your belt.', 'Anh chị tháo thắt lưng ra giúp.'),
  ('Put your bag on the belt.', 'Đặt túi lên băng chuyền.'),
  ('I am travelling for holiday.', 'Tôi đi du lịch.'),
  ('I will stay for two weeks.', 'Tôi ở lại hai tuần.'),
  ('Where can I exchange money?', 'Tôi đổi tiền ở đâu ạ?'),
  ('Where is the baggage claim?', 'Chỗ lấy hành lý ở đâu ạ?'),
  ('My luggage is missing.', 'Hành lý của tôi bị thất lạc.'),
  ('Could you help me find it?', 'Anh chị tìm giúp tôi được không?'),
  ('Is there a free shuttle bus?', 'Có xe buýt miễn phí không ạ?'),
  ('Where can I get a taxi?', 'Tôi bắt taxi ở đâu ạ?'),
  ('How long is the flight?', 'Bay bao lâu thì tới ạ?'),
  ('Please fasten your seat belt.', 'Xin quý khách thắt dây an toàn.'),
  ('Could I have some water, please?', 'Cho tôi xin một chút nước.'),
  ('Where is the toilet on the plane?', 'Nhà vệ sinh trên máy bay ở đâu ạ?'),
  ('I feel airsick.', 'Tôi bị say máy bay.'),
  ('We have arrived.', 'Chúng ta đã tới nơi.'),
  ('Thank you for flying with us.', 'Cảm ơn quý khách đã bay cùng chúng tôi.')
) AS v(word, vi) ON TRUE
WHERE t.name = '30 câu tiếng anh ở sân bay'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );

-- ---------- 30 câu tiếng anh ở khách sạn ----------
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT t.id, v.word, v.vi, ''
FROM public.topics t
JOIN (VALUES
  ('I have a reservation.', 'Tôi có đặt phòng trước.'),
  ('My name is Minh.', 'Tôi tên là Minh.'),
  ('I would like to check in.', 'Tôi muốn nhận phòng.'),
  ('Do you have any rooms available?', 'Khách sạn còn phòng trống không ạ?'),
  ('How much is one night?', 'Một đêm bao nhiêu tiền ạ?'),
  ('Is breakfast included?', 'Giá đã gồm bữa sáng chưa ạ?'),
  ('I would like a double room.', 'Tôi muốn một phòng đôi.'),
  ('Can I see the room first?', 'Tôi xem phòng trước được không ạ?'),
  ('What floor is my room on?', 'Phòng của tôi ở tầng mấy ạ?'),
  ('Where is the lift?', 'Thang máy ở đâu ạ?'),
  ('Here is your key card.', 'Thẻ phòng của anh chị đây.'),
  ('What time is breakfast?', 'Mấy giờ có bữa sáng ạ?'),
  ('The air conditioner is not working.', 'Điều hoà không chạy ạ.'),
  ('There is no hot water.', 'Phòng không có nước nóng.'),
  ('Could you send someone to fix it?', 'Anh chị cho người tới sửa giúp nhé.'),
  ('Could I have more towels?', 'Cho tôi xin thêm khăn tắm.'),
  ('Please clean my room.', 'Nhờ anh chị dọn phòng giúp tôi.'),
  ('Do not disturb, please.', 'Xin đừng làm phiền.'),
  ('Is there Wi-Fi in the room?', 'Trong phòng có wifi không ạ?'),
  ('What is the Wi-Fi password?', 'Mật khẩu wifi là gì ạ?'),
  ('Can I keep my luggage here?', 'Tôi gửi hành lý ở đây được không ạ?'),
  ('What time is check out?', 'Mấy giờ phải trả phòng ạ?'),
  ('Can I check out later?', 'Tôi trả phòng muộn hơn được không ạ?'),
  ('I would like to check out now.', 'Tôi muốn trả phòng bây giờ.'),
  ('Could I have the bill, please?', 'Cho tôi xin hoá đơn với ạ.'),
  ('I think there is a mistake here.', 'Hình như chỗ này có nhầm lẫn ạ.'),
  ('Could you call a taxi for me?', 'Anh chị gọi taxi giúp tôi nhé.'),
  ('Is there a swimming pool?', 'Khách sạn có bể bơi không ạ?'),
  ('We had a lovely stay.', 'Chúng tôi ở rất thoải mái.'),
  ('Thank you for everything.', 'Cảm ơn anh chị nhiều ạ.')
) AS v(word, vi) ON TRUE
WHERE t.name = '30 câu tiếng anh ở khách sạn'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );

-- ---------- 30 câu tiếng anh đi khám bệnh ----------
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT t.id, v.word, v.vi, ''
FROM public.topics t
JOIN (VALUES
  ('I would like to see a doctor.', 'Tôi muốn khám bệnh.'),
  ('Do I need an appointment?', 'Tôi có cần đặt lịch trước không ạ?'),
  ('I have an appointment at ten.', 'Tôi có hẹn lúc mười giờ.'),
  ('What is the problem?', 'Anh chị thấy trong người thế nào?'),
  ('I do not feel well.', 'Tôi thấy trong người không khoẻ.'),
  ('I have a headache.', 'Tôi bị đau đầu.'),
  ('I have a sore throat.', 'Tôi bị đau họng.'),
  ('I have a fever.', 'Tôi bị sốt.'),
  ('I have a cough.', 'Tôi bị ho.'),
  ('My stomach hurts.', 'Tôi bị đau bụng.'),
  ('It hurts here.', 'Tôi đau ở chỗ này.'),
  ('How long have you felt like this?', 'Anh chị bị như vậy bao lâu rồi?'),
  ('Since yesterday.', 'Từ hôm qua ạ.'),
  ('For about three days.', 'Khoảng ba ngày rồi ạ.'),
  ('Do you take any medicine?', 'Anh chị có đang uống thuốc gì không?'),
  ('I am allergic to some medicine.', 'Tôi bị dị ứng với vài loại thuốc.'),
  ('Please open your mouth.', 'Anh chị há miệng ra giúp tôi.'),
  ('Take a deep breath.', 'Hít một hơi thật sâu.'),
  ('I will check your temperature.', 'Tôi đo nhiệt độ cho anh chị nhé.'),
  ('You need to rest.', 'Anh chị cần nghỉ ngơi.'),
  ('Drink a lot of water.', 'Nhớ uống nhiều nước.'),
  ('Take this medicine twice a day.', 'Thuốc này uống ngày hai lần.'),
  ('Take it after meals.', 'Uống sau bữa ăn nhé.'),
  ('Is it serious?', 'Có nặng không ạ?'),
  ('Do not worry, it is not serious.', 'Đừng lo, không nặng đâu.'),
  ('Come back in three days.', 'Ba ngày nữa quay lại khám nhé.'),
  ('Where is the pharmacy?', 'Nhà thuốc ở đâu ạ?'),
  ('How much do I have to pay?', 'Tôi phải trả bao nhiêu tiền ạ?'),
  ('Thank you, doctor.', 'Cảm ơn bác sĩ ạ.'),
  ('Get well soon.', 'Chúc anh chị chóng khoẻ.')
) AS v(word, vi) ON TRUE
WHERE t.name = '30 câu tiếng anh đi khám bệnh'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );

-- ---------- 30 câu tiếng anh gọi điện thoại ----------
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT t.id, v.word, v.vi, ''
FROM public.topics t
JOIN (VALUES
  ('Hello, who is speaking?', 'Alô, ai đang nói đấy ạ?'),
  ('This is Nam speaking.', 'Nam đây ạ.'),
  ('May I speak to Mr Hung?', 'Cho tôi gặp anh Hùng được không ạ?'),
  ('Just a moment, please.', 'Anh chị chờ một chút ạ.'),
  ('I will put you through.', 'Tôi nối máy cho anh chị.'),
  ('He is not here right now.', 'Anh ấy hiện không có ở đây ạ.'),
  ('Can I take a message?', 'Anh chị có muốn nhắn lại gì không ạ?'),
  ('Could you call back later?', 'Anh chị gọi lại sau được không ạ?'),
  ('Could you ask him to call me?', 'Nhờ anh chị bảo anh ấy gọi lại cho tôi.'),
  ('Sorry, I cannot hear you.', 'Xin lỗi, tôi không nghe rõ.'),
  ('Could you speak up, please?', 'Anh chị nói to hơn một chút được không?'),
  ('The line is bad.', 'Đường truyền kém quá.'),
  ('I will call you back.', 'Tôi sẽ gọi lại cho anh chị.'),
  ('Are you free to talk now?', 'Bây giờ anh chị nói chuyện được không?'),
  ('I am in a meeting.', 'Tôi đang họp.'),
  ('Can we talk this afternoon?', 'Chiều nay mình nói chuyện nhé?'),
  ('I am calling about the order.', 'Tôi gọi về chuyện đơn hàng.'),
  ('Could you repeat that, please?', 'Anh chị nhắc lại giúp tôi được không?'),
  ('Let me write it down.', 'Để tôi ghi lại đã.'),
  ('How do you spell that?', 'Từ đó đánh vần thế nào ạ?'),
  ('I think you have the wrong number.', 'Chắc anh chị gọi nhầm số rồi ạ.'),
  ('Sorry to bother you.', 'Xin lỗi đã làm phiền anh chị.'),
  ('Thank you for calling.', 'Cảm ơn anh chị đã gọi.'),
  ('I will send you a message.', 'Tôi sẽ nhắn tin cho anh chị.'),
  ('Please text me the address.', 'Nhờ anh chị nhắn địa chỉ cho tôi.'),
  ('My battery is running out.', 'Máy tôi sắp hết pin.'),
  ('I will call you tomorrow morning.', 'Sáng mai tôi gọi cho anh chị.'),
  ('Please hold the line.', 'Anh chị giữ máy nhé.'),
  ('See you then.', 'Hẹn gặp lại anh chị.'),
  ('Goodbye.', 'Tạm biệt ạ.')
) AS v(word, vi) ON TRUE
WHERE t.name = '30 câu tiếng anh gọi điện thoại'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );

-- ========================================================
-- KIỂM TRA KẾT QUẢ — toàn bộ chủ đề đang có, kèm số thẻ
-- ========================================================
SELECT c.name AS nhom, t.name AS chu_de, t.mode, COUNT(cd.id) AS so_the
FROM public.topics t
LEFT JOIN public.categories c ON c.id = t.category_id
LEFT JOIN public.cards cd ON cd.topic_id = t.id
GROUP BY c.name, t.name, t.mode
ORDER BY c.name, t.name;
