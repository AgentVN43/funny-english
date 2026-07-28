-- Dữ liệu mẫu theo đúng menu khách gửi: 3 nhóm, 11 chủ đề, 500 thẻ.
--
--   Tiếng anh tiểu học          → 40 + 50 + 60 + 60 câu   (mode = 'sentence')
--   Tiếng anh giao tiếp hàng ngày → 40 + 50 + 30 + 40 câu (mode = 'sentence')
--   Từ vựng tiếng anh trẻ em    → 40 + 40 + 50 từ         (mode = 'word')
--
-- AN TOÀN CHẠY LẠI NHIỀU LẦN (idempotent): nhóm/chủ đề đối chiếu theo tên,
-- thẻ đối chiếu theo (chủ đề, từ). Chạy lại chỉ thêm phần còn thiếu, không
-- nhân bản và không đụng vào thẻ admin đã sửa tay.
--
-- CHẠY SAU migration_question_modes.sql — cần sẵn hai cột mode và
-- question_prompt trên bảng topics.
--
-- Ảnh của phần từ vựng là emoji dựng thành SVG nhúng thẳng vào cột image:
-- xem được ngay mà không phụ thuộc host bên ngoài. Đây là ảnh tạm để nhìn bố
-- cục — thay bằng ảnh thật qua trang admin khi có.

-- Hàm dựng ảnh emoji. Đặt trong pg_temp nên tự biến mất khi đóng phiên, không
-- để lại gì trong database.
CREATE OR REPLACE FUNCTION pg_temp.emoji_img(e TEXT) RETURNS TEXT AS $$
  SELECT 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="32" y="48" font-size="48" text-anchor="middle">'
    || e || '</text></svg>'
$$ LANGUAGE sql IMMUTABLE;

-- ========================================================
-- NHÓM
-- ========================================================
INSERT INTO public.categories (name, description)
SELECT v.name, v.description
FROM (VALUES
  ('Tiếng anh tiểu học', 'Câu tiếng Anh thông dụng theo từng lớp'),
  ('Tiếng anh giao tiếp hàng ngày', 'Mẫu câu dùng ngoài đời thật'),
  ('Từ vựng tiếng anh trẻ em', 'Từ vựng theo chủ điểm quen thuộc')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c WHERE c.name = v.name
);

-- ========================================================
-- CHỦ ĐỀ
-- ========================================================
INSERT INTO public.topics (category_id, name, description, mode, question_prompt)
SELECT c.id, v.name, v.description, v.mode, v.prompt
FROM (VALUES
  ('Tiếng anh tiểu học', '40 câu thông dụng lớp 1', 'Chào hỏi và câu lệnh trong lớp', 'sentence', ''),
  ('Tiếng anh tiểu học', '50 câu thông dụng lớp 2', 'Gia đình, thời gian, thói quen', 'sentence', ''),
  ('Tiếng anh tiểu học', '60 câu thông dụng lớp 3', 'Trường lớp, thời tiết, kể chuyện đã qua', 'sentence', ''),
  ('Tiếng anh tiểu học', '60 câu thông dụng lớp 4', 'Sở thích, dự định, hội thoại dài hơn', 'sentence', ''),
  ('Tiếng anh giao tiếp hàng ngày', '40 câu các hoạt động hàng ngày', 'Một ngày từ sáng đến tối', 'sentence', ''),
  ('Tiếng anh giao tiếp hàng ngày', '50 câu tiếng anh trong nhà hàng', 'Đặt bàn, gọi món, thanh toán', 'sentence', ''),
  ('Tiếng anh giao tiếp hàng ngày', '30 câu tiếng anh hỏi đường', 'Hỏi và chỉ đường', 'sentence', ''),
  ('Tiếng anh giao tiếp hàng ngày', '40 câu tiếng anh siêu thị mua sắm', 'Tìm hàng, hỏi giá, thanh toán', 'sentence', ''),
  ('Từ vựng tiếng anh trẻ em', '40 câu về các loại trái cây', 'Trái cây quen thuộc', 'word', 'Tên tiếng Anh của {tu} là gì?'),
  ('Từ vựng tiếng anh trẻ em', '40 câu động vật', 'Con vật quanh ta', 'word', 'Tên tiếng Anh của {tu} là gì?'),
  ('Từ vựng tiếng anh trẻ em', '50 câu về đồ vật', 'Đồ dùng trong nhà và ở lớp', 'word', 'Tên tiếng Anh của {tu} là gì?')
) AS v(category, name, description, mode, prompt)
JOIN public.categories c ON c.name = v.category
WHERE NOT EXISTS (
  SELECT 1 FROM public.topics t WHERE t.name = v.name
);

-- ========================================================
-- THẺ
-- ========================================================

-- ---------- 40 câu thông dụng lớp 1 ----------
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT t.id, v.word, v.vi, ''
FROM public.topics t
JOIN (VALUES
  ('Hello.', 'Xin chào.'),
  ('Good morning.', 'Chào buổi sáng.'),
  ('Good afternoon.', 'Chào buổi chiều.'),
  ('Good evening.', 'Chào buổi tối.'),
  ('Good night.', 'Chúc ngủ ngon.'),
  ('Goodbye.', 'Tạm biệt.'),
  ('See you tomorrow.', 'Hẹn gặp lại ngày mai.'),
  ('How are you?', 'Bạn khoẻ không?'),
  ('I am fine, thank you.', 'Mình khoẻ, cảm ơn bạn.'),
  ('What is your name?', 'Bạn tên là gì?'),
  ('My name is Nam.', 'Mình tên là Nam.'),
  ('How old are you?', 'Bạn bao nhiêu tuổi?'),
  ('I am six years old.', 'Mình sáu tuổi.'),
  ('Nice to meet you.', 'Rất vui được gặp bạn.'),
  ('This is my friend.', 'Đây là bạn của mình.'),
  ('Thank you very much.', 'Cảm ơn bạn rất nhiều.'),
  ('You are welcome.', 'Không có gì đâu.'),
  ('I am sorry.', 'Mình xin lỗi.'),
  ('Excuse me.', 'Cho mình hỏi một chút.'),
  ('Please sit down.', 'Mời bạn ngồi xuống.'),
  ('Please stand up.', 'Mời bạn đứng lên.'),
  ('Open your book.', 'Hãy mở sách ra.'),
  ('Close your book.', 'Hãy gấp sách lại.'),
  ('Please listen carefully.', 'Hãy lắng nghe cho kỹ.'),
  ('Look at the board.', 'Hãy nhìn lên bảng.'),
  ('Be quiet, please.', 'Hãy trật tự nào.'),
  ('May I come in?', 'Em vào lớp được không ạ?'),
  ('May I go out?', 'Em ra ngoài được không ạ?'),
  ('I do not understand.', 'Mình không hiểu.'),
  ('Can you help me?', 'Bạn giúp mình được không?'),
  ('What is this?', 'Đây là cái gì?'),
  ('This is a pencil.', 'Đây là cây bút chì.'),
  ('What colour is it?', 'Nó màu gì?'),
  ('It is red.', 'Nó màu đỏ.'),
  ('How many books are there?', 'Có bao nhiêu quyển sách?'),
  ('There are three books.', 'Có ba quyển sách.'),
  ('I like ice cream.', 'Mình thích ăn kem.'),
  ('I am hungry.', 'Mình đói bụng rồi.'),
  ('I am thirsty.', 'Mình khát nước.'),
  ('Let us play together.', 'Chúng mình cùng chơi nhé.')
) AS v(word, vi) ON TRUE
WHERE t.name = '40 câu thông dụng lớp 1'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );

-- ---------- 50 câu thông dụng lớp 2 ----------
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT t.id, v.word, v.vi, ''
FROM public.topics t
JOIN (VALUES
  ('Where do you live?', 'Bạn sống ở đâu?'),
  ('I live in Hanoi.', 'Mình sống ở Hà Nội.'),
  ('This is my family.', 'Đây là gia đình mình.'),
  ('I have one brother.', 'Mình có một anh trai.'),
  ('I have two sisters.', 'Mình có hai chị gái.'),
  ('My father is a doctor.', 'Bố mình là bác sĩ.'),
  ('My mother is a teacher.', 'Mẹ mình là giáo viên.'),
  ('What day is it today?', 'Hôm nay là thứ mấy?'),
  ('It is Monday.', 'Hôm nay là thứ Hai.'),
  ('What time is it?', 'Bây giờ là mấy giờ?'),
  ('It is seven o''clock.', 'Bây giờ là bảy giờ.'),
  ('I get up at six.', 'Mình dậy lúc sáu giờ.'),
  ('I brush my teeth.', 'Mình đánh răng.'),
  ('I wash my face.', 'Mình rửa mặt.'),
  ('I have breakfast.', 'Mình ăn sáng.'),
  ('I go to school.', 'Mình đi học.'),
  ('I go home.', 'Mình về nhà.'),
  ('I do my homework.', 'Mình làm bài tập.'),
  ('I go to bed at nine.', 'Mình đi ngủ lúc chín giờ.'),
  ('What is your favourite colour?', 'Màu bạn thích nhất là màu gì?'),
  ('My favourite colour is blue.', 'Màu mình thích nhất là xanh dương.'),
  ('Do you like cats?', 'Bạn có thích mèo không?'),
  ('Yes, I do.', 'Có, mình thích.'),
  ('No, I do not.', 'Không, mình không thích.'),
  ('I can swim.', 'Mình biết bơi.'),
  ('I cannot ride a bike.', 'Mình chưa biết đi xe đạp.'),
  ('Can you sing?', 'Bạn hát được không?'),
  ('Let us go to the park.', 'Chúng mình đi công viên nhé.'),
  ('It is sunny today.', 'Hôm nay trời nắng.'),
  ('It is raining.', 'Trời đang mưa.'),
  ('I like playing football.', 'Mình thích chơi bóng đá.'),
  ('Where is my bag?', 'Cặp của mình đâu rồi?'),
  ('It is on the table.', 'Nó ở trên bàn.'),
  ('It is under the chair.', 'Nó ở dưới ghế.'),
  ('Come here, please.', 'Lại đây nào.'),
  ('Do not run in class.', 'Đừng chạy trong lớp.'),
  ('Wash your hands.', 'Hãy đi rửa tay.'),
  ('Happy birthday!', 'Chúc mừng sinh nhật!'),
  ('How much is it?', 'Cái này giá bao nhiêu?'),
  ('I would like some water.', 'Mình muốn xin một chút nước.'),
  ('My school is big.', 'Trường của mình rất rộng.'),
  ('My classroom is clean.', 'Lớp học của mình rất sạch.'),
  ('I have English today.', 'Hôm nay mình có tiết tiếng Anh.'),
  ('I love my teacher.', 'Mình yêu quý cô giáo.'),
  ('She is very kind.', 'Cô ấy rất tốt bụng.'),
  ('He is my best friend.', 'Cậu ấy là bạn thân của mình.'),
  ('Let me help you.', 'Để mình giúp bạn.'),
  ('That is a good idea.', 'Ý hay đấy.'),
  ('See you later.', 'Hẹn gặp lại bạn sau.'),
  ('Have a nice day.', 'Chúc bạn một ngày vui.')
) AS v(word, vi) ON TRUE
WHERE t.name = '50 câu thông dụng lớp 2'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );

-- ---------- 60 câu thông dụng lớp 3 ----------
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT t.id, v.word, v.vi, ''
FROM public.topics t
JOIN (VALUES
  ('What subject do you like?', 'Bạn thích môn học nào?'),
  ('I like maths.', 'Mình thích môn Toán.'),
  ('I do not like history.', 'Mình không thích môn Lịch sử.'),
  ('What do you do at break time?', 'Giờ ra chơi bạn làm gì?'),
  ('I play with my friends.', 'Mình chơi với các bạn.'),
  ('How many lessons do you have today?', 'Hôm nay bạn có mấy tiết học?'),
  ('I have five lessons.', 'Mình có năm tiết.'),
  ('Who is your teacher?', 'Cô giáo của bạn là ai?'),
  ('Her name is Miss Lan.', 'Cô ấy tên là cô Lan.'),
  ('Where is the library?', 'Thư viện ở đâu?'),
  ('It is next to the office.', 'Nó ở cạnh phòng giáo viên.'),
  ('Let us go to the library.', 'Chúng mình vào thư viện nhé.'),
  ('I am reading a book.', 'Mình đang đọc sách.'),
  ('What are you doing?', 'Bạn đang làm gì đấy?'),
  ('I am drawing a picture.', 'Mình đang vẽ tranh.'),
  ('Can I borrow your pen?', 'Mình mượn bút của bạn được không?'),
  ('Here you are.', 'Của bạn đây.'),
  ('Whose bag is this?', 'Cặp này của ai?'),
  ('It is mine.', 'Nó của mình.'),
  ('What is the weather like today?', 'Hôm nay thời tiết thế nào?'),
  ('It is cold and windy.', 'Trời lạnh và có gió.'),
  ('I wear a warm coat.', 'Mình mặc áo khoác ấm.'),
  ('What do you want to be?', 'Sau này bạn muốn làm nghề gì?'),
  ('I want to be a doctor.', 'Mình muốn làm bác sĩ.'),
  ('Where were you yesterday?', 'Hôm qua bạn ở đâu?'),
  ('I was at home.', 'Mình ở nhà.'),
  ('What did you do?', 'Bạn đã làm gì?'),
  ('I watched cartoons.', 'Mình xem phim hoạt hình.'),
  ('I visited my grandparents.', 'Mình về thăm ông bà.'),
  ('Did you have fun?', 'Bạn có vui không?'),
  ('Yes, it was great.', 'Có, vui lắm.'),
  ('How do you go to school?', 'Bạn đi học bằng gì?'),
  ('I go by bike.', 'Mình đi xe đạp.'),
  ('My house is near the school.', 'Nhà mình gần trường.'),
  ('There are four people in my family.', 'Nhà mình có bốn người.'),
  ('My sister is younger than me.', 'Em gái mình nhỏ tuổi hơn mình.'),
  ('I am taller than my brother.', 'Mình cao hơn anh trai.'),
  ('What is your phone number?', 'Số điện thoại của bạn là gì?'),
  ('Please write it down.', 'Bạn viết ra giúp mình nhé.'),
  ('Speak louder, please.', 'Bạn nói to hơn một chút nhé.'),
  ('Say it again, please.', 'Bạn nhắc lại giúp mình nhé.'),
  ('How do you spell your name?', 'Tên bạn đánh vần thế nào?'),
  ('What does it mean?', 'Từ này nghĩa là gì?'),
  ('I understand now.', 'Giờ thì mình hiểu rồi.'),
  ('Well done!', 'Làm tốt lắm!'),
  ('Try again.', 'Thử lại lần nữa nào.'),
  ('Do not be shy.', 'Đừng ngại.'),
  ('Be careful.', 'Cẩn thận nhé.'),
  ('Hurry up!', 'Nhanh lên nào!'),
  ('Wait for me.', 'Chờ mình với.'),
  ('I am late.', 'Mình bị muộn rồi.'),
  ('I feel tired.', 'Mình thấy mệt.'),
  ('I have a headache.', 'Mình bị đau đầu.'),
  ('May I drink some water?', 'Cho em xin một chút nước ạ?'),
  ('Let us clean the classroom.', 'Chúng mình cùng dọn lớp nhé.'),
  ('Put your rubbish in the bin.', 'Bỏ rác vào thùng nhé.'),
  ('Turn off the lights.', 'Nhớ tắt đèn nhé.'),
  ('Close the door, please.', 'Đóng cửa giúp mình nhé.'),
  ('It is time to go home.', 'Đến giờ về nhà rồi.'),
  ('Goodbye, see you on Monday.', 'Tạm biệt, hẹn gặp lại thứ Hai.')
) AS v(word, vi) ON TRUE
WHERE t.name = '60 câu thông dụng lớp 3'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );

-- ---------- 60 câu thông dụng lớp 4 ----------
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT t.id, v.word, v.vi, ''
FROM public.topics t
JOIN (VALUES
  ('Where are you from?', 'Bạn đến từ đâu?'),
  ('I am from Vietnam.', 'Mình đến từ Việt Nam.'),
  ('What nationality are you?', 'Bạn là người nước nào?'),
  ('I am Vietnamese.', 'Mình là người Việt Nam.'),
  ('What languages do you speak?', 'Bạn nói được những thứ tiếng nào?'),
  ('I speak Vietnamese and English.', 'Mình nói tiếng Việt và tiếng Anh.'),
  ('How long have you learnt English?', 'Bạn học tiếng Anh bao lâu rồi?'),
  ('I have learnt it for two years.', 'Mình học được hai năm rồi.'),
  ('What are you going to do this weekend?', 'Cuối tuần này bạn định làm gì?'),
  ('I am going to visit my aunt.', 'Mình sẽ đi thăm cô của mình.'),
  ('Would you like to come with me?', 'Bạn đi cùng mình nhé?'),
  ('That sounds interesting.', 'Nghe hay đấy.'),
  ('I am afraid I cannot.', 'Mình e là mình không đi được.'),
  ('Maybe next time.', 'Để lần sau vậy.'),
  ('What is your hobby?', 'Sở thích của bạn là gì?'),
  ('I enjoy playing the piano.', 'Mình thích chơi đàn piano.'),
  ('How often do you practise?', 'Bạn tập bao lâu một lần?'),
  ('Three times a week.', 'Ba lần một tuần.'),
  ('What did you do last summer?', 'Hè năm ngoái bạn đã làm gì?'),
  ('I went to the beach with my family.', 'Mình đi biển cùng gia đình.'),
  ('The weather was beautiful.', 'Thời tiết đẹp lắm.'),
  ('We stayed there for a week.', 'Chúng mình ở đó một tuần.'),
  ('Have you ever been to Da Nang?', 'Bạn đã tới Đà Nẵng bao giờ chưa?'),
  ('No, I have never been there.', 'Chưa, mình chưa tới đó bao giờ.'),
  ('I would love to go someday.', 'Mình rất muốn đi vào một ngày nào đó.'),
  ('What is your favourite subject?', 'Môn học bạn thích nhất là môn gì?'),
  ('I like science best.', 'Mình thích môn Khoa học nhất.'),
  ('Because it is very interesting.', 'Vì môn đó rất thú vị.'),
  ('Which sport do you play?', 'Bạn chơi môn thể thao nào?'),
  ('I play badminton after school.', 'Mình chơi cầu lông sau giờ học.'),
  ('Who do you play with?', 'Bạn chơi cùng ai?'),
  ('I play with my classmates.', 'Mình chơi với các bạn cùng lớp.'),
  ('What time does school start?', 'Mấy giờ thì vào học?'),
  ('It starts at seven o''clock.', 'Bảy giờ vào học.'),
  ('How far is your school?', 'Trường của bạn có xa không?'),
  ('It is about two kilometres away.', 'Khoảng hai cây số.'),
  ('What do you usually have for lunch?', 'Bữa trưa bạn thường ăn gì?'),
  ('I usually have rice and vegetables.', 'Mình thường ăn cơm với rau.'),
  ('Do you help your parents at home?', 'Ở nhà bạn có giúp bố mẹ không?'),
  ('Yes, I wash the dishes.', 'Có, mình rửa bát.'),
  ('I also feed my dog.', 'Mình còn cho chó ăn nữa.'),
  ('What are you reading?', 'Bạn đang đọc gì thế?'),
  ('I am reading a story book.', 'Mình đang đọc truyện.'),
  ('Could you tell me about it?', 'Bạn kể cho mình nghe với.'),
  ('It is about a brave boy.', 'Truyện kể về một cậu bé dũng cảm.'),
  ('I think it is very exciting.', 'Mình thấy truyện rất hấp dẫn.'),
  ('Do you agree with me?', 'Bạn có đồng ý với mình không?'),
  ('Yes, I think so too.', 'Ừ, mình cũng nghĩ vậy.'),
  ('I am not sure about that.', 'Cái đó mình không chắc lắm.'),
  ('Let me think for a moment.', 'Để mình nghĩ một chút.'),
  ('Could you say that again?', 'Bạn nhắc lại được không?'),
  ('I did not catch that.', 'Mình chưa nghe rõ.'),
  ('Sorry for being late.', 'Xin lỗi vì mình đến muộn.'),
  ('It does not matter.', 'Không sao đâu.'),
  ('Congratulations on your prize!', 'Chúc mừng bạn được giải!'),
  ('Thank you for your help.', 'Cảm ơn bạn đã giúp mình.'),
  ('Take care of yourself.', 'Bạn giữ gìn sức khoẻ nhé.'),
  ('Give my best wishes to your family.', 'Cho mình gửi lời chào tới gia đình bạn.'),
  ('Have a safe trip.', 'Chúc bạn đi đường bình an.'),
  ('I hope to see you again soon.', 'Mong sớm gặp lại bạn.')
) AS v(word, vi) ON TRUE
WHERE t.name = '60 câu thông dụng lớp 4'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );

-- ---------- 40 câu các hoạt động hàng ngày ----------
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT t.id, v.word, v.vi, ''
FROM public.topics t
JOIN (VALUES
  ('I wake up at six o''clock.', 'Mình thức dậy lúc sáu giờ.'),
  ('I turn off the alarm clock.', 'Mình tắt đồng hồ báo thức.'),
  ('I make my bed.', 'Mình gấp chăn màn.'),
  ('I brush my teeth.', 'Mình đánh răng.'),
  ('I take a shower.', 'Mình đi tắm.'),
  ('I comb my hair.', 'Mình chải đầu.'),
  ('I get dressed.', 'Mình mặc quần áo.'),
  ('I have breakfast with my family.', 'Mình ăn sáng cùng gia đình.'),
  ('I put on my shoes.', 'Mình đi giày.'),
  ('I leave the house at seven.', 'Mình ra khỏi nhà lúc bảy giờ.'),
  ('I go to school by bike.', 'Mình đi học bằng xe đạp.'),
  ('I say hello to my friends.', 'Mình chào các bạn.'),
  ('I study hard in class.', 'Mình học chăm chỉ trong lớp.'),
  ('I have lunch at school.', 'Mình ăn trưa ở trường.'),
  ('I take a short nap.', 'Mình ngủ trưa một lát.'),
  ('I play football after school.', 'Mình chơi bóng đá sau giờ học.'),
  ('I come home in the afternoon.', 'Buổi chiều mình về nhà.'),
  ('I change my clothes.', 'Mình thay quần áo.'),
  ('I help my mother cook dinner.', 'Mình giúp mẹ nấu bữa tối.'),
  ('I set the table.', 'Mình dọn bàn ăn.'),
  ('I have dinner at seven.', 'Mình ăn tối lúc bảy giờ.'),
  ('I wash the dishes.', 'Mình rửa bát.'),
  ('I do my homework.', 'Mình làm bài tập.'),
  ('I read a story book.', 'Mình đọc truyện.'),
  ('I watch cartoons on TV.', 'Mình xem hoạt hình trên tivi.'),
  ('I play with my little sister.', 'Mình chơi với em gái.'),
  ('I feed my dog.', 'Mình cho chó ăn.'),
  ('I water the flowers.', 'Mình tưới hoa.'),
  ('I clean my room.', 'Mình dọn phòng.'),
  ('I take out the rubbish.', 'Mình đi đổ rác.'),
  ('I call my grandmother.', 'Mình gọi điện cho bà.'),
  ('I pack my school bag.', 'Mình soạn cặp sách.'),
  ('I wash my face before bed.', 'Mình rửa mặt trước khi đi ngủ.'),
  ('I say good night to my parents.', 'Mình chúc bố mẹ ngủ ngon.'),
  ('I go to bed at half past nine.', 'Mình đi ngủ lúc chín giờ rưỡi.'),
  ('I sleep for eight hours.', 'Mình ngủ tám tiếng.'),
  ('On Saturday I visit my grandparents.', 'Thứ Bảy mình về thăm ông bà.'),
  ('On Sunday I go to the park.', 'Chủ nhật mình đi công viên.'),
  ('I ride my bike around the lake.', 'Mình đạp xe quanh hồ.'),
  ('It is a busy but happy day.', 'Một ngày bận rộn mà vui.')
) AS v(word, vi) ON TRUE
WHERE t.name = '40 câu các hoạt động hàng ngày'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );

-- ---------- 50 câu tiếng anh trong nhà hàng ----------
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT t.id, v.word, v.vi, ''
FROM public.topics t
JOIN (VALUES
  ('A table for two, please.', 'Cho tôi một bàn hai người.'),
  ('Do you have a reservation?', 'Anh chị đã đặt bàn trước chưa ạ?'),
  ('I booked a table for seven o''clock.', 'Tôi đã đặt bàn lúc bảy giờ.'),
  ('Is this table free?', 'Bàn này còn trống không ạ?'),
  ('Could we sit by the window?', 'Chúng tôi ngồi cạnh cửa sổ được không?'),
  ('May I see the menu, please?', 'Cho tôi xem thực đơn với ạ.'),
  ('What do you recommend?', 'Anh chị gợi ý món nào ạ?'),
  ('What is today''s special?', 'Hôm nay có món đặc biệt gì ạ?'),
  ('I am ready to order.', 'Tôi gọi món đây ạ.'),
  ('I would like a beef noodle soup.', 'Cho tôi một bát phở bò.'),
  ('I will have the fried rice.', 'Tôi lấy món cơm rang.'),
  ('Can I have a glass of water?', 'Cho tôi xin một cốc nước.'),
  ('No ice, please.', 'Đừng cho đá nhé ạ.'),
  ('I am allergic to seafood.', 'Tôi bị dị ứng hải sản.'),
  ('Is this dish spicy?', 'Món này có cay không ạ?'),
  ('Not too spicy, please.', 'Đừng cay quá nhé ạ.'),
  ('I am a vegetarian.', 'Tôi ăn chay.'),
  ('Do you have any vegetarian dishes?', 'Nhà hàng có món chay không ạ?'),
  ('What is in this dish?', 'Món này gồm những gì ạ?'),
  ('How long will it take?', 'Chờ khoảng bao lâu ạ?'),
  ('Could you bring some napkins?', 'Cho tôi xin ít khăn giấy.'),
  ('Can I have another fork?', 'Cho tôi xin cái dĩa khác.'),
  ('Excuse me, this is not what I ordered.', 'Xin lỗi, đây không phải món tôi gọi.'),
  ('The soup is cold.', 'Món súp bị nguội rồi ạ.'),
  ('Could you heat it up, please?', 'Anh chị hâm nóng lại giúp tôi nhé.'),
  ('Everything is delicious.', 'Món nào cũng ngon cả.'),
  ('It tastes great.', 'Ăn ngon lắm ạ.'),
  ('I am full, thank you.', 'Tôi no rồi, cảm ơn ạ.'),
  ('Could we have some more rice?', 'Cho chúng tôi thêm cơm với ạ.'),
  ('One more glass of juice, please.', 'Cho tôi thêm một cốc nước ép.'),
  ('Do you serve breakfast?', 'Nhà hàng có phục vụ bữa sáng không ạ?'),
  ('What time do you close?', 'Mấy giờ nhà hàng đóng cửa ạ?'),
  ('Is service included?', 'Đã tính phí phục vụ chưa ạ?'),
  ('Can I pay by card?', 'Tôi trả bằng thẻ được không ạ?'),
  ('The bill, please.', 'Cho tôi thanh toán ạ.'),
  ('Could we split the bill?', 'Chúng tôi chia đôi hoá đơn được không?'),
  ('I think there is a mistake in the bill.', 'Hình như hoá đơn có nhầm lẫn ạ.'),
  ('Keep the change.', 'Không cần trả lại tiền thừa đâu ạ.'),
  ('Could I have a receipt?', 'Cho tôi xin hoá đơn với ạ.'),
  ('Can I take this home?', 'Tôi mang phần này về được không ạ?'),
  ('Could you pack it for me?', 'Anh chị gói lại giúp tôi nhé.'),
  ('Where is the toilet?', 'Nhà vệ sinh ở đâu ạ?'),
  ('Is there Wi-Fi here?', 'Ở đây có wifi không ạ?'),
  ('What is the Wi-Fi password?', 'Mật khẩu wifi là gì ạ?'),
  ('The food came very quickly.', 'Món ra nhanh thật.'),
  ('We enjoyed the meal.', 'Chúng tôi ăn rất ngon miệng.'),
  ('Thank you for your service.', 'Cảm ơn anh chị đã phục vụ.'),
  ('We will come back again.', 'Chúng tôi sẽ quay lại.'),
  ('Do you deliver?', 'Nhà hàng có giao đồ ăn không ạ?'),
  ('I would like to order takeaway.', 'Tôi muốn đặt món mang về.')
) AS v(word, vi) ON TRUE
WHERE t.name = '50 câu tiếng anh trong nhà hàng'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );

-- ---------- 30 câu tiếng anh hỏi đường ----------
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT t.id, v.word, v.vi, ''
FROM public.topics t
JOIN (VALUES
  ('Excuse me, can you help me?', 'Xin lỗi, anh chị giúp tôi được không?'),
  ('I am lost.', 'Tôi bị lạc đường.'),
  ('Where am I now?', 'Tôi đang ở đâu vậy ạ?'),
  ('How do I get to the train station?', 'Tôi tới ga tàu bằng cách nào ạ?'),
  ('Where is the nearest bus stop?', 'Bến xe buýt gần nhất ở đâu ạ?'),
  ('Is it far from here?', 'Chỗ đó có xa đây không ạ?'),
  ('It is about ten minutes on foot.', 'Đi bộ khoảng mười phút.'),
  ('Can I walk there?', 'Tôi đi bộ tới đó được không?'),
  ('Go straight ahead.', 'Anh chị cứ đi thẳng.'),
  ('Turn left at the corner.', 'Tới góc đường thì rẽ trái.'),
  ('Turn right after the bridge.', 'Qua cầu thì rẽ phải.'),
  ('It is on your left.', 'Nó nằm bên tay trái.'),
  ('It is next to the post office.', 'Nó ở ngay cạnh bưu điện.'),
  ('It is opposite the market.', 'Nó đối diện khu chợ.'),
  ('It is between the bank and the school.', 'Nó nằm giữa ngân hàng và trường học.'),
  ('Go past the traffic lights.', 'Đi qua chỗ đèn giao thông.'),
  ('Take the second turning.', 'Rẽ ở ngã rẽ thứ hai.'),
  ('Which bus goes to the airport?', 'Xe buýt nào đi sân bay ạ?'),
  ('Take bus number seven.', 'Anh chị đi xe buýt số bảy.'),
  ('Where can I buy a ticket?', 'Tôi mua vé ở đâu ạ?'),
  ('How much is the ticket?', 'Vé giá bao nhiêu ạ?'),
  ('How many stops is it?', 'Đi mấy bến thì tới ạ?'),
  ('Could you tell me when to get off?', 'Tới nơi anh chị báo tôi xuống nhé.'),
  ('Is this the right way to the museum?', 'Đường này tới bảo tàng đúng không ạ?'),
  ('Could you show me on the map?', 'Anh chị chỉ giúp tôi trên bản đồ nhé.'),
  ('Could you say that again, please?', 'Anh chị nhắc lại giúp tôi được không?'),
  ('Could you speak more slowly?', 'Anh chị nói chậm hơn một chút được không?'),
  ('Is there a taxi around here?', 'Quanh đây có taxi không ạ?'),
  ('Thank you for your help.', 'Cảm ơn anh chị đã giúp.'),
  ('Have a nice day.', 'Chúc anh chị một ngày tốt lành.')
) AS v(word, vi) ON TRUE
WHERE t.name = '30 câu tiếng anh hỏi đường'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );

-- ---------- 40 câu tiếng anh siêu thị mua sắm ----------
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT t.id, v.word, v.vi, ''
FROM public.topics t
JOIN (VALUES
  ('Where are the shopping trolleys?', 'Xe đẩy hàng để ở đâu ạ?'),
  ('Excuse me, where is the milk?', 'Xin lỗi, sữa để ở đâu ạ?'),
  ('It is in aisle three.', 'Ở dãy số ba ạ.'),
  ('Do you sell fresh bread?', 'Ở đây có bán bánh mì tươi không ạ?'),
  ('Where can I find the vegetables?', 'Rau củ ở khu nào ạ?'),
  ('How much is this?', 'Cái này bao nhiêu tiền ạ?'),
  ('How much are these apples?', 'Táo này bao nhiêu tiền một cân ạ?'),
  ('It is fifty thousand dong a kilo.', 'Năm mươi nghìn một cân ạ.'),
  ('That is too expensive.', 'Đắt quá ạ.'),
  ('Do you have anything cheaper?', 'Có loại nào rẻ hơn không ạ?'),
  ('Is it on sale?', 'Cái này có đang giảm giá không ạ?'),
  ('Is there a discount today?', 'Hôm nay có khuyến mãi gì không ạ?'),
  ('I will take two, please.', 'Cho tôi lấy hai cái.'),
  ('Can I have a bag, please?', 'Cho tôi xin một cái túi.'),
  ('Where is the checkout?', 'Quầy thanh toán ở đâu ạ?'),
  ('Is this the queue?', 'Đây là hàng chờ phải không ạ?'),
  ('Do you have a membership card?', 'Anh chị có thẻ thành viên không ạ?'),
  ('Can I pay by card?', 'Tôi trả bằng thẻ được không ạ?'),
  ('I will pay in cash.', 'Tôi trả tiền mặt.'),
  ('Could I have a receipt, please?', 'Cho tôi xin hoá đơn với ạ.'),
  ('I think you gave me the wrong change.', 'Hình như anh chị trả nhầm tiền thừa.'),
  ('This one is broken.', 'Cái này bị hỏng rồi ạ.'),
  ('Can I change it for another one?', 'Tôi đổi sang cái khác được không ạ?'),
  ('Can I return this?', 'Tôi trả lại món này được không ạ?'),
  ('What is the expiry date?', 'Hạn sử dụng đến khi nào ạ?'),
  ('Is this fresh?', 'Cái này còn tươi không ạ?'),
  ('Do you have a smaller size?', 'Có cỡ nhỏ hơn không ạ?'),
  ('Do you have another colour?', 'Có màu khác không ạ?'),
  ('Can I try it on?', 'Tôi mặc thử được không ạ?'),
  ('Where is the fitting room?', 'Phòng thử đồ ở đâu ạ?'),
  ('It fits me well.', 'Cái này vừa với tôi.'),
  ('It is too big for me.', 'Cái này rộng quá.'),
  ('I am just looking, thank you.', 'Tôi chỉ xem thôi, cảm ơn ạ.'),
  ('Could you help me carry this?', 'Anh chị xách giúp tôi được không?'),
  ('Where do I return the trolley?', 'Trả xe đẩy ở chỗ nào ạ?'),
  ('Do you deliver to my home?', 'Có giao hàng tận nhà không ạ?'),
  ('What time does the supermarket close?', 'Mấy giờ siêu thị đóng cửa ạ?'),
  ('Is there a pharmacy inside?', 'Trong này có nhà thuốc không ạ?'),
  ('Thank you for your help.', 'Cảm ơn anh chị đã giúp.'),
  ('Have a good day.', 'Chúc anh chị một ngày vui.')
) AS v(word, vi) ON TRUE
WHERE t.name = '40 câu tiếng anh siêu thị mua sắm'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );

-- ---------- 40 câu về các loại trái cây ----------
-- Trái cây Việt Nam không có emoji tương ứng thì để trống ảnh, hơn là gán một
-- quả trông chẳng liên quan. Màn hình học vẫn chạy bình thường khi thiếu ảnh.
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT
  t.id,
  v.word,
  v.vi,
  CASE WHEN v.emoji = '' THEN '' ELSE pg_temp.emoji_img(v.emoji) END
FROM public.topics t
JOIN (VALUES
  ('apple', 'quả táo', '🍎'),
  ('banana', 'quả chuối', '🍌'),
  ('orange', 'quả cam', '🍊'),
  ('grapes', 'chùm nho', '🍇'),
  ('watermelon', 'quả dưa hấu', '🍉'),
  ('strawberry', 'quả dâu tây', '🍓'),
  ('pineapple', 'quả dứa', '🍍'),
  ('mango', 'quả xoài', '🥭'),
  ('peach', 'quả đào', '🍑'),
  ('pear', 'quả lê', '🍐'),
  ('lemon', 'quả chanh vàng', '🍋'),
  ('cherry', 'quả anh đào', '🍒'),
  ('kiwi', 'quả kiwi', '🥝'),
  ('coconut', 'quả dừa', '🥥'),
  ('avocado', 'quả bơ', '🥑'),
  ('melon', 'quả dưa lưới', '🍈'),
  ('blueberry', 'quả việt quất', '🫐'),
  ('tomato', 'quả cà chua', '🍅'),
  ('green apple', 'quả táo xanh', '🍏'),
  ('mandarin', 'quả quýt', '🍊'),
  ('papaya', 'quả đu đủ', ''),
  ('guava', 'quả ổi', ''),
  ('durian', 'quả sầu riêng', ''),
  ('longan', 'quả nhãn', ''),
  ('lychee', 'quả vải', ''),
  ('rambutan', 'quả chôm chôm', ''),
  ('jackfruit', 'quả mít', ''),
  ('star fruit', 'quả khế', ''),
  ('custard apple', 'quả na', ''),
  ('dragon fruit', 'quả thanh long', ''),
  ('pomelo', 'quả bưởi', ''),
  ('plum', 'quả mận', ''),
  ('apricot', 'quả mơ', ''),
  ('persimmon', 'quả hồng', ''),
  ('passion fruit', 'quả chanh dây', ''),
  ('grapefruit', 'quả bưởi chùm', ''),
  ('raspberry', 'quả mâm xôi', ''),
  ('sapodilla', 'quả hồng xiêm', ''),
  ('date', 'quả chà là', ''),
  ('fig', 'quả sung', '')
) AS v(word, vi, emoji) ON TRUE
WHERE t.name = '40 câu về các loại trái cây'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );

-- ---------- 40 câu động vật ----------
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT
  t.id,
  v.word,
  v.vi,
  CASE WHEN v.emoji = '' THEN '' ELSE pg_temp.emoji_img(v.emoji) END
FROM public.topics t
JOIN (VALUES
  ('dog', 'con chó', '🐶'),
  ('cat', 'con mèo', '🐱'),
  ('mouse', 'con chuột', '🐭'),
  ('rabbit', 'con thỏ', '🐰'),
  ('fox', 'con cáo', '🦊'),
  ('bear', 'con gấu', '🐻'),
  ('panda', 'con gấu trúc', '🐼'),
  ('koala', 'con gấu túi', '🐨'),
  ('tiger', 'con hổ', '🐯'),
  ('lion', 'con sư tử', '🦁'),
  ('cow', 'con bò', '🐮'),
  ('pig', 'con lợn', '🐷'),
  ('frog', 'con ếch', '🐸'),
  ('monkey', 'con khỉ', '🐵'),
  ('chicken', 'con gà', '🐔'),
  ('penguin', 'con chim cánh cụt', '🐧'),
  ('bird', 'con chim', '🐦'),
  ('duck', 'con vịt', '🦆'),
  ('eagle', 'con đại bàng', '🦅'),
  ('owl', 'con cú', '🦉'),
  ('bat', 'con dơi', '🦇'),
  ('wolf', 'con sói', '🐺'),
  ('horse', 'con ngựa', '🐴'),
  ('zebra', 'con ngựa vằn', '🦓'),
  ('deer', 'con hươu', '🦌'),
  ('elephant', 'con voi', '🐘'),
  ('rhino', 'con tê giác', '🦏'),
  ('hippo', 'con hà mã', '🦛'),
  ('giraffe', 'con hươu cao cổ', '🦒'),
  ('camel', 'con lạc đà', '🐫'),
  ('sheep', 'con cừu', '🐑'),
  ('goat', 'con dê', '🐐'),
  ('dolphin', 'con cá heo', '🐬'),
  ('whale', 'con cá voi', '🐳'),
  ('fish', 'con cá', '🐠'),
  ('shark', 'con cá mập', '🦈'),
  ('octopus', 'con bạch tuộc', '🐙'),
  ('crab', 'con cua', '🦀'),
  ('turtle', 'con rùa', '🐢'),
  ('snake', 'con rắn', '🐍')
) AS v(word, vi, emoji) ON TRUE
WHERE t.name = '40 câu động vật'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );

-- ---------- 50 câu về đồ vật ----------
INSERT INTO public.cards (topic_id, word, meaning_vi, image)
SELECT
  t.id,
  v.word,
  v.vi,
  CASE WHEN v.emoji = '' THEN '' ELSE pg_temp.emoji_img(v.emoji) END
FROM public.topics t
JOIN (VALUES
  ('book', 'quyển sách', '📖'),
  ('pen', 'cây bút bi', '🖊️'),
  ('pencil', 'cây bút chì', '✏️'),
  ('ruler', 'cái thước kẻ', '📏'),
  ('eraser', 'cục tẩy', ''),
  ('scissors', 'cái kéo', '✂️'),
  ('backpack', 'cái cặp sách', '🎒'),
  ('notebook', 'quyển vở', '📓'),
  ('crayon', 'bút sáp màu', '🖍️'),
  ('paintbrush', 'cây cọ vẽ', '🖌️'),
  ('alarm clock', 'đồng hồ báo thức', '⏰'),
  ('watch', 'đồng hồ đeo tay', '⌚'),
  ('phone', 'cái điện thoại', '📱'),
  ('computer', 'cái máy tính', '💻'),
  ('keyboard', 'bàn phím', '⌨️'),
  ('television', 'cái tivi', '📺'),
  ('radio', 'cái đài', '📻'),
  ('camera', 'cái máy ảnh', '📷'),
  ('lamp', 'cái đèn', '💡'),
  ('candle', 'cây nến', '🕯️'),
  ('key', 'chiếc chìa khoá', '🔑'),
  ('door', 'cánh cửa', '🚪'),
  ('window', 'cửa sổ', '🪟'),
  ('chair', 'cái ghế', '🪑'),
  ('bed', 'cái giường', '🛏️'),
  ('sofa', 'ghế sofa', '🛋️'),
  ('table', 'cái bàn', ''),
  ('mirror', 'cái gương', '🪞'),
  ('cup', 'cái cốc', '☕'),
  ('plate', 'cái đĩa', '🍽️'),
  ('spoon', 'cái thìa', '🥄'),
  ('fork', 'cái dĩa', '🍴'),
  ('knife', 'con dao', '🔪'),
  ('bowl', 'cái bát', '🥣'),
  ('umbrella', 'cái ô', '☂️'),
  ('handbag', 'cái túi xách', '👜'),
  ('shoes', 'đôi giày', '👟'),
  ('cap', 'cái mũ lưỡi trai', '🧢'),
  ('shirt', 'cái áo', '👕'),
  ('trousers', 'cái quần', '👖'),
  ('socks', 'đôi tất', '🧦'),
  ('glasses', 'cái kính', '👓'),
  ('toothbrush', 'bàn chải đánh răng', '🪥'),
  ('soap', 'bánh xà phòng', '🧼'),
  ('broom', 'cái chổi', '🧹'),
  ('box', 'cái hộp', '📦'),
  ('basket', 'cái giỏ', '🧺'),
  ('ball', 'quả bóng', '⚽'),
  ('bicycle', 'chiếc xe đạp', '🚲'),
  ('car', 'chiếc ô tô', '🚗')
) AS v(word, vi, emoji) ON TRUE
WHERE t.name = '50 câu về đồ vật'
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.topic_id = t.id AND c.word = v.word
  );


-- ========================================================
-- KIỂM TRA KẾT QUẢ
-- ========================================================
SELECT c.name AS nhom, t.name AS chu_de, t.mode, COUNT(cd.id) AS so_the
FROM public.topics t
LEFT JOIN public.categories c ON c.id = t.category_id
LEFT JOIN public.cards cd ON cd.topic_id = t.id
GROUP BY c.name, t.name, t.mode
ORDER BY c.name, t.name;
