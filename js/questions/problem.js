/* ═══════════════════════════════════════════════════════════════════════
   Unified "problem" engine — a single generator that picks from a large
   age-tagged pool of hard multi-step IQ-style problems. Every item is
   multiple-choice (one correct, three "plausibly wrong" distractors).

   Difficulty principle: every question should require THINKING — not just
   calculation or recognition. The obvious answer is usually a distractor;
   the correct answer reveals itself after a moment of reasoning or
   re-reading.

   Pool tags per item:
     • id           unique string (dedup key)
     • family       groups for variety + category display
     • q            the question stem
     • a            the correct answer (string or number — stringified)
     • d            three distractors (each is a common-mistake answer)
     • minAge/maxAge  inclusive age window the item is suitable for

   Generation:
     1. Read iq_user_age from sessionStorage.
     2. Filter pool to items whose age window covers the user.
     3. Prefer under-represented families (balances the run).
     4. Pick via rng.pick, add to session dedup set.
     5. Shuffle the four options.

   All slots in questions/index.js share this generator; session-wide
   dedup (pickedThisSession) ensures no repeat within a single 20-q run.
   ═══════════════════════════════════════════════════════════════════════ */

/* Display category names per family */
const CATEGORY = {
  arithmetic:   "Arithmetic",
  wordproblem:  "Word Problem",
  sequence:     "Number Sequence",
  letterseq:    "Letter Sequence",
  analogy:      "Analogy",
  trick:        "Trick Question",
  deduction:    "Deduction",
  oddone:       "Odd One Out",
  timeage:      "Time & Age",
  pattern:      "Pattern Code",
};

/* ─────────────────────────── THE POOL ───────────────────────────────────
   Every distractor is engineered: it's the answer you arrive at via one
   specific mistake — dropping the sign, forgetting a step, applying the
   wrong operation, taking the question too literally, etc. That's what
   makes the questions un-guessable on retry.
   ─────────────────────────────────────────────────────────────────────── */
const POOL = [

  /* ═══ Arithmetic — real multi-step reasoning, not just recall ═══ */

  { id: "ar-01", family: "arithmetic", minAge: 10, maxAge: 99,
    q: "A number plus half of itself equals 18. What is the number?",
    a: 12, d: [9, 6, 24] },

  { id: "ar-02", family: "arithmetic", minAge: 10, maxAge: 99,
    q: "If you double a number and then add 6, the result is 30. What was the number?",
    a: 12, d: [18, 15, 10] },

  { id: "ar-03", family: "arithmetic", minAge: 10, maxAge: 99,
    q: "The sum of three consecutive integers is 42. What is the largest of the three?",
    a: 15, d: [14, 16, 13] },

  { id: "ar-15", family: "arithmetic", minAge: 10, maxAge: 99,
    q: "A square has a perimeter of 36 cm. What is the length of one side?",
    a: "9 cm", d: ["6 cm", "4 cm", "12 cm"] },

  { id: "ar-16", family: "arithmetic", minAge: 10, maxAge: 99,
    q: "Which is larger: 3/4 or 5/8?",
    a: "3/4", d: ["5/8", "They are equal", "Cannot be compared"] },

  { id: "ar-17", family: "arithmetic", minAge: 10, maxAge: 99,
    q: "You have $20. You spend $7 on a book and $5 on a snack. How much do you have left?",
    a: "$8", d: ["$12", "$13", "$7"] },

  { id: "ar-04", family: "arithmetic", minAge: 13, maxAge: 99,
    q: "Half of one quarter of 400 is:",
    a: 50, d: [100, 25, 200] },

  { id: "ar-05", family: "arithmetic", minAge: 13, maxAge: 99,
    q: "If 3² + 4² = x², what is x?",
    a: 5, d: [7, 6, 25] },

  { id: "ar-06", family: "arithmetic", minAge: 13, maxAge: 99,
    q: "Two numbers add to 30 and differ by 6. What is the larger one?",
    a: 18, d: [15, 24, 12] },

  { id: "ar-07", family: "arithmetic", minAge: 13, maxAge: 99,
    q: "If 3x + 5 = 2x + 9, what is x?",
    a: 4, d: [2, 14, 7] },

  { id: "ar-08", family: "arithmetic", minAge: 16, maxAge: 99,
    q: "5 pens cost the same as 3 notebooks. A notebook costs $2 more than a pen. How much is one pen?",
    a: "$3", d: ["$2", "$5", "$4"] },

  { id: "ar-09", family: "arithmetic", minAge: 16, maxAge: 99,
    q: "The average of 5 numbers is 12. When one number is removed, the average of the remaining four is 10. What number was removed?",
    a: 20, d: [10, 14, 22] },

  { id: "ar-10", family: "arithmetic", minAge: 16, maxAge: 99,
    q: "A rectangle is three times as long as it is wide. Its area is 75. What is its width?",
    a: 5, d: [15, 25, 10] },

  { id: "ar-11", family: "arithmetic", minAge: 16, maxAge: 99,
    q: "After a 25% increase followed by a 10% decrease, a price is $45. What was the original price?",
    a: "$40", d: ["$45", "$50", "$36"] },

  { id: "ar-12", family: "arithmetic", minAge: 13, maxAge: 99,
    q: "I multiply a number by 7. The result is 3 more than 4 times the number. What is the number?",
    a: 1, d: [3, 2, 7] },

  { id: "ar-13", family: "arithmetic", minAge: 16, maxAge: 99,
    q: "The product of two consecutive whole numbers is 132. What is the smaller of the two?",
    a: 11, d: [12, 10, 13] },

  { id: "ar-14", family: "arithmetic", minAge: 13, maxAge: 99,
    q: "If 40% of a number is 28, what is the number?",
    a: 70, d: [68, 56, 84] },

  /* ═══ Word problems — multi-step, misleading, require picture-building ═══ */

  { id: "wp-01", family: "wordproblem", minAge: 10, maxAge: 99,
    q: "A snail climbs 3 feet up a 12-foot well each day, but slides back 2 feet each night. How many days until it reaches the top?",
    a: 10, d: [12, 9, 8] },

  { id: "wp-02", family: "wordproblem", minAge: 13, maxAge: 99,
    q: "Two trains 300 miles apart travel toward each other. One goes 45 mph, the other 55 mph. How long until they meet?",
    a: "3 hours", d: ["6 hours", "2 hours", "5 hours"] },

  { id: "wp-03", family: "wordproblem", minAge: 13, maxAge: 99,
    q: "If 3 cats catch 3 mice in 3 minutes, how many cats are needed to catch 100 mice in 100 minutes?",
    a: 3, d: [100, 33, 10] },

  { id: "wp-04", family: "wordproblem", minAge: 13, maxAge: 99,
    q: "It takes 20 minutes to cut a log into 4 pieces. How long does it take to cut the same log into 6 pieces?",
    a: "33 minutes", d: ["30 min", "40 min", "25 min"] },

  { id: "wp-05", family: "wordproblem", minAge: 13, maxAge: 99,
    q: "3 people finish a job in 8 days. How many days do 4 people need for the same job (same rate each)?",
    a: 6, d: [10, 5, 8] },

  { id: "wp-06", family: "wordproblem", minAge: 16, maxAge: 99,
    q: "A jar has red and blue marbles in a 3 : 5 ratio. After adding 8 more red marbles the ratio becomes 1 : 1. How many marbles were in the jar originally?",
    a: 32, d: [16, 24, 40] },

  { id: "wp-07", family: "wordproblem", minAge: 16, maxAge: 99,
    q: "After a 20% discount and a 10% sales tax, a shirt costs $44. What was its price before the discount?",
    a: "$50", d: ["$40", "$55", "$48"] },

  { id: "wp-08", family: "wordproblem", minAge: 16, maxAge: 99,
    q: "One pipe fills a pool in 4 hours. Another pipe fills the same pool in 6 hours. With both running, how long to fill the pool?",
    a: "2.4 hours", d: ["5 hours", "3 hours", "10 hours"] },

  { id: "wp-09", family: "wordproblem", minAge: 16, maxAge: 99,
    q: "Two candles of the same length are lit at the same time. One burns out in 6 hours, the other in 4 hours. After how many hours is the first candle twice as long as the second?",
    a: "3 hours", d: ["2 hours", "4 hours", "5 hours"] },

  { id: "wp-10", family: "wordproblem", minAge: 16, maxAge: 99,
    q: "A car drives from A to B at 60 mph and returns at 40 mph. What is the average speed over the round trip?",
    a: "48 mph", d: ["50 mph", "52 mph", "100 mph"] },

  { id: "wp-11", family: "wordproblem", minAge: 13, maxAge: 99,
    q: "A book has 240 pages. You read one third in the first week, and one quarter of what was left in the second week. How many pages remain?",
    a: 120, d: [80, 100, 140] },

  { id: "wp-12", family: "wordproblem", minAge: 13, maxAge: 99,
    q: "$600 is split among three people in the ratio 2 : 3 : 5. What is the largest share?",
    a: "$300", d: ["$200", "$240", "$100"] },

  { id: "wp-13", family: "wordproblem", minAge: 16, maxAge: 99,
    q: "A store offers 30% off. You also have a coupon for 10% cashback on what you paid. On a $100 item, how much did you actually spend (after cashback)?",
    a: "$63", d: ["$60", "$70", "$80"] },

  { id: "wp-14", family: "wordproblem", minAge: 16, maxAge: 99,
    q: "If 2 workers paint 4 fences in 3 hours, how many hours for 4 workers to paint 8 fences (same rate)?",
    a: "3 hours", d: ["6 hours", "1.5 hours", "4 hours"] },

  { id: "wp-15", family: "wordproblem", minAge: 16, maxAge: 99,
    q: "A farmer has 100 feet of fence and wants to enclose the largest possible rectangular area. What is that area?",
    a: "625 sq ft", d: ["400 sq ft", "500 sq ft", "1000 sq ft"] },

  { id: "wp-16", family: "wordproblem", minAge: 10, maxAge: 99,
    q: "You buy 3 apples at 40 cents each and 2 oranges at 75 cents each. You pay with a $5 bill. How much change?",
    a: "$2.30", d: ["$2.50", "$1.70", "$3.80"] },

  { id: "wp-17", family: "wordproblem", minAge: 10, maxAge: 99,
    q: "A rope is 36 cm long. Cut it into pieces of 4 cm each. How many pieces do you get?",
    a: 9, d: [8, 10, 7] },

  { id: "wp-18", family: "wordproblem", minAge: 10, maxAge: 99,
    q: "There are 5 dogs in a yard. Each dog has 4 legs and 2 ears. How many ears and legs altogether?",
    a: 30, d: [20, 25, 40] },

  /* ═══ Number sequences — the rule is non-obvious ═══ */

  { id: "ns-01", family: "sequence", minAge: 10, maxAge: 99,
    q: "What comes next? 1, 4, 9, 16, 25, __",
    a: 36, d: [32, 30, 49] },

  { id: "ns-02", family: "sequence", minAge: 10, maxAge: 99,
    q: "What comes next? 7, 14, 28, 56, __",
    a: 112, d: [84, 100, 120] },

  { id: "ns-15", family: "sequence", minAge: 10, maxAge: 99,
    q: "What is missing? 2, 4, 8, __, 32, 64",
    a: 16, d: [12, 10, 24] },

  { id: "ns-16", family: "sequence", minAge: 10, maxAge: 99,
    q: "What comes next? 100, 90, 80, 70, __",
    a: 60, d: [50, 65, 55] },

  { id: "ns-03", family: "sequence", minAge: 13, maxAge: 99,
    q: "What comes next? 2, 3, 5, 8, 13, __",
    a: 21, d: [18, 16, 25] },

  { id: "ns-04", family: "sequence", minAge: 13, maxAge: 99,
    q: "What is missing? 1, 8, 27, __, 125",
    a: 64, d: [48, 81, 100] },

  { id: "ns-05", family: "sequence", minAge: 13, maxAge: 99,
    q: "What comes next? 2, 6, 12, 20, 30, __",
    a: 42, d: [40, 36, 46] },

  { id: "ns-06", family: "sequence", minAge: 13, maxAge: 99,
    q: "What comes next? 3, 5, 8, 12, 17, __",
    a: 23, d: [22, 24, 21] },

  { id: "ns-07", family: "sequence", minAge: 13, maxAge: 99,
    q: "What comes next? 2, 3, 5, 7, 11, __",
    a: 13, d: [12, 14, 15] },

  { id: "ns-08", family: "sequence", minAge: 13, maxAge: 99,
    q: "What is missing? 100, 96, 89, 79, __, 50",
    a: 66, d: [64, 68, 70] },

  { id: "ns-09", family: "sequence", minAge: 16, maxAge: 99,
    q: "What comes next? 1, 2, 6, 24, 120, __",
    a: 720, d: [600, 360, 840] },

  { id: "ns-10", family: "sequence", minAge: 16, maxAge: 99,
    q: "What comes next? 1, 4, 10, 22, 46, __",
    a: 94, d: [88, 92, 96] },

  { id: "ns-11", family: "sequence", minAge: 16, maxAge: 99,
    q: "What is missing? 2, 10, 30, 68, __, 222",
    a: 130, d: [120, 140, 150] },

  { id: "ns-12", family: "sequence", minAge: 13, maxAge: 99,
    q: "What is missing? 4, 9, 25, 49, __, 169",
    a: 121, d: [100, 120, 144] },

  { id: "ns-13", family: "sequence", minAge: 16, maxAge: 99,
    q: "What comes next? 2, 4, 12, 48, __",
    a: 240, d: [144, 192, 120] },

  { id: "ns-14", family: "sequence", minAge: 16, maxAge: 99,
    q: "What comes next? 3, 4, 7, 11, 18, __",
    a: 29, d: [25, 28, 36] },

  /* ═══ Letter sequences / calendar patterns ═══ */

  { id: "ls-01", family: "letterseq", minAge: 13, maxAge: 99,
    q: "What comes next? B, D, G, K, __",
    a: "P", d: ["O", "Q", "N"] },

  { id: "ls-02", family: "letterseq", minAge: 13, maxAge: 99,
    q: "What comes next? AZ, BY, CX, DW, __",
    a: "EV", d: ["EU", "FV", "DV"] },

  { id: "ls-03", family: "letterseq", minAge: 13, maxAge: 99,
    q: "Which day continues the pattern? Monday, Wednesday, Friday, __",
    a: "Sunday", d: ["Saturday", "Tuesday", "Thursday"] },

  { id: "ls-04", family: "letterseq", minAge: 13, maxAge: 99,
    q: "What comes next? A, E, I, M, __",
    a: "Q", d: ["N", "O", "P"] },

  { id: "ls-05", family: "letterseq", minAge: 13, maxAge: 99,
    q: "What comes next? Z, X, U, Q, __",
    a: "L", d: ["M", "N", "K"] },

  /* ═══ Analogies — abstract / functional relationships ═══ */

  { id: "an-01", family: "analogy", minAge: 10, maxAge: 99,
    q: "Fish is to water as bird is to __?",
    a: "sky", d: ["nest", "worm", "tree"] },

  { id: "an-02", family: "analogy", minAge: 10, maxAge: 99,
    q: "Riddle is to solution as question is to __?",
    a: "answer", d: ["quiz", "puzzle", "mystery"] },

  { id: "an-14", family: "analogy", minAge: 10, maxAge: 99,
    q: "Glove is to hand as sock is to __?",
    a: "foot", d: ["shoe", "toe", "leg"] },

  { id: "an-15", family: "analogy", minAge: 10, maxAge: 99,
    q: "Pen is to write as scissors is to __?",
    a: "cut", d: ["draw", "paste", "sharp"] },

  { id: "an-03", family: "analogy", minAge: 13, maxAge: 99,
    q: "Drought is to rain as famine is to __?",
    a: "food", d: ["water", "hunger", "weather"] },

  { id: "an-04", family: "analogy", minAge: 13, maxAge: 99,
    q: "Symphony is to composer as novel is to __?",
    a: "author", d: ["reader", "book", "publisher"] },

  { id: "an-05", family: "analogy", minAge: 13, maxAge: 99,
    q: "Canvas is to painter as marble is to __?",
    a: "sculptor", d: ["artist", "chisel", "stone"] },

  { id: "an-06", family: "analogy", minAge: 13, maxAge: 99,
    q: "Orchestra is to conductor as ship is to __?",
    a: "captain", d: ["sailor", "ocean", "anchor"] },

  { id: "an-07", family: "analogy", minAge: 13, maxAge: 99,
    q: "Doctor is to patient as lawyer is to __?",
    a: "client", d: ["judge", "court", "law"] },

  { id: "an-08", family: "analogy", minAge: 13, maxAge: 99,
    q: "Novel is to chapter as song is to __?",
    a: "verse", d: ["melody", "rhythm", "singer"] },

  { id: "an-09", family: "analogy", minAge: 13, maxAge: 99,
    q: "Spring is to flower as autumn is to __?",
    a: "leaf", d: ["wind", "rain", "harvest"] },

  { id: "an-10", family: "analogy", minAge: 16, maxAge: 99,
    q: "Thermometer is to temperature as barometer is to __?",
    a: "pressure", d: ["wind", "rain", "humidity"] },

  { id: "an-11", family: "analogy", minAge: 16, maxAge: 99,
    q: "Diamond is to hardness as feather is to __?",
    a: "lightness", d: ["bird", "softness", "flight"] },

  { id: "an-12", family: "analogy", minAge: 16, maxAge: 99,
    q: "Cell is to organism as brick is to __?",
    a: "building", d: ["wall", "clay", "cement"] },

  { id: "an-13", family: "analogy", minAge: 13, maxAge: 99,
    q: "Author is to novel as architect is to __?",
    a: "building", d: ["blueprint", "design", "wall"] },

  /* ═══ Trick questions — require careful re-reading ═══ */

  { id: "tr-01", family: "trick", minAge: 10, maxAge: 99,
    q: "A farmer had 15 sheep. All but 8 ran away. How many are left?",
    a: 8, d: [7, 15, 23] },

  { id: "tr-02", family: "trick", minAge: 10, maxAge: 99,
    q: "Johnny's mother has three children. The first is named April, the second is May. What is the name of the third child?",
    a: "Johnny", d: ["June", "July", "August"] },

  { id: "tr-03", family: "trick", minAge: 10, maxAge: 99,
    q: "You are running a race. You pass the person in 2nd place. What place are you in now?",
    a: "2nd", d: ["1st", "3rd", "4th"] },

  { id: "tr-04", family: "trick", minAge: 10, maxAge: 99,
    q: "A doctor gives you 3 pills and tells you to take one every half hour. How long will the pills last?",
    a: "1 hour", d: ["1.5 hours", "30 minutes", "3 hours"] },

  { id: "tr-05", family: "trick", minAge: 10, maxAge: 99,
    q: "Which weighs more — a ton of bricks or a ton of feathers?",
    a: "They weigh the same", d: ["The bricks", "The feathers", "Cannot be determined"] },

  { id: "tr-06", family: "trick", minAge: 13, maxAge: 99,
    q: "How many birthdays does the average person have?",
    a: 1, d: [70, 80, 100] },

  { id: "tr-07", family: "trick", minAge: 13, maxAge: 99,
    q: "A man builds a rectangular house with all four walls facing south. A bear walks by. What colour is the bear?",
    a: "White", d: ["Brown", "Black", "Grey"] },

  { id: "tr-08", family: "trick", minAge: 13, maxAge: 99,
    q: "Before Mt. Everest was discovered, what was the tallest mountain in the world?",
    a: "Mt. Everest", d: ["K2", "Mt. Kilimanjaro", "Mt. McKinley"] },

  { id: "tr-09", family: "trick", minAge: 13, maxAge: 99,
    q: "A rooster lays an egg on the peak of a roof. Which side does the egg roll down?",
    a: "Roosters don't lay eggs", d: ["Either side", "The steeper side", "Neither — it balances"] },

  { id: "tr-10", family: "trick", minAge: 13, maxAge: 99,
    q: "A plane crashes exactly on the US–Canada border. Where should the survivors be buried?",
    a: "Survivors aren't buried", d: ["United States", "Canada", "On the border"] },

  { id: "tr-11", family: "trick", minAge: 13, maxAge: 99,
    q: "How many times can you subtract 10 from 100?",
    a: "Once", d: ["10", "11", "100"] },

  { id: "tr-12", family: "trick", minAge: 13, maxAge: 99,
    q: "Mr. Smith has four daughters. Each daughter has exactly one brother. How many children does Mr. Smith have?",
    a: 5, d: [4, 8, 9] },

  { id: "tr-13", family: "trick", minAge: 13, maxAge: 99,
    q: "Two fathers and two sons go fishing. Each catches one fish. They bring home three fish total. How is this possible?",
    a: "Grandfather, father, son (3 people)", d: ["One fish escaped", "A fish counted twice", "They're lying"] },

  { id: "tr-14", family: "trick", minAge: 13, maxAge: 99,
    q: "You have 12 matchsticks. You remove 3. How many matchsticks do you have?",
    a: 3, d: [9, 12, 15] },

  { id: "tr-15", family: "trick", minAge: 13, maxAge: 99,
    q: "A father and son are in a car crash. The father dies. At the hospital the surgeon says, \"I can't operate on him — he's my son!\" How is this possible?",
    a: "The surgeon is his mother", d: ["He was adopted", "The son has two fathers", "It's a hospital error"] },

  { id: "tr-16", family: "trick", minAge: 13, maxAge: 99,
    q: "You have only one match. You enter a dark cabin with an oil lamp, a candle, and a fireplace. What do you light first?",
    a: "The match", d: ["The candle", "The oil lamp", "The fireplace"] },

  /* ═══ Deduction — syllogisms, conditional logic, ranking puzzles ═══ */

  { id: "dd-01", family: "deduction", minAge: 10, maxAge: 99,
    q: "Tim is taller than Sam. Sam is taller than Joe. Who is the shortest?",
    a: "Joe", d: ["Tim", "Sam", "Cannot be determined"] },

  { id: "dd-02", family: "deduction", minAge: 10, maxAge: 99,
    q: "In a race, Pam finished after Joy but before Kim. Who came last?",
    a: "Kim", d: ["Pam", "Joy", "Cannot be determined"] },

  { id: "dd-03", family: "deduction", minAge: 13, maxAge: 99,
    q: "If it rains, the grass gets wet. The grass is wet. Which must be true?",
    a: "None of these must be true.", d: ["It rained.", "It did not rain.", "It is still raining."] },

  { id: "dd-04", family: "deduction", minAge: 13, maxAge: 99,
    q: "If it rains, I stay home. I did not stay home. Which must be true?",
    a: "It did not rain.", d: ["It rained.", "I went to work.", "Cannot be determined."] },

  { id: "dd-05", family: "deduction", minAge: 13, maxAge: 99,
    q: "All xeps are tall. Zorin is a xep. Which must be true?",
    a: "Zorin is tall.", d: ["Not all zorins are tall.", "Zorin is a xep but not tall.", "Cannot be determined."] },

  { id: "dd-06", family: "deduction", minAge: 13, maxAge: 99,
    q: "Everyone in the club knows Susan. Tom does not know Susan. Which must be true?",
    a: "Tom is not in the club.", d: ["Tom is in the club.", "Susan knows Tom.", "Cannot be determined."] },

  { id: "dd-07", family: "deduction", minAge: 16, maxAge: 99,
    q: "No cats are dogs. Some pets are cats. Which must be true?",
    a: "Some pets are not dogs.", d: ["No pets are dogs.", "Some pets are dogs.", "All pets are cats."] },

  { id: "dd-08", family: "deduction", minAge: 16, maxAge: 99,
    q: "Some doctors are women. All women are kind. Which must be true?",
    a: "Some doctors are kind.", d: ["All doctors are kind.", "No doctors are kind.", "All kind people are doctors."] },

  { id: "dd-09", family: "deduction", minAge: 13, maxAge: 99,
    q: "If A is true then B is true. If B is true then C is true. A is true. Which must be true?",
    a: "C is true.", d: ["C may be false.", "Only B is true.", "Cannot be determined."] },

  { id: "dd-10", family: "deduction", minAge: 16, maxAge: 99,
    q: "Alice, Bob, Carol and Dan sit in a row. Alice is next to Bob. Carol is NOT next to Bob. Dan is at one end. If Dan is at position 1, who is at position 2?",
    a: "Alice or Bob", d: ["Carol", "Dan's twin", "Cannot be determined"] },

  { id: "dd-11", family: "deduction", minAge: 16, maxAge: 99,
    q: "If every X is a Y, and no Y is a Z, which must be true?",
    a: "No X is a Z.", d: ["Every Z is a Y.", "Some X is a Z.", "Cannot be determined."] },

  /* ═══ Odd one out — the category is subtle ═══ */

  { id: "oo-01", family: "oddone", minAge: 10, maxAge: 99,
    q: "Which does NOT belong? apple, pear, carrot, grape",
    a: "carrot", d: ["apple", "pear", "grape"] },

  { id: "oo-02", family: "oddone", minAge: 10, maxAge: 99,
    q: "Which does NOT belong? circle, square, cube, triangle",
    a: "cube", d: ["circle", "square", "triangle"] },

  { id: "oo-03", family: "oddone", minAge: 10, maxAge: 99,
    q: "Which does NOT belong? eagle, bat, sparrow, parrot",
    a: "bat", d: ["eagle", "sparrow", "parrot"] },

  { id: "oo-04", family: "oddone", minAge: 13, maxAge: 99,
    q: "Which does NOT belong? 16, 25, 36, 49, 60",
    a: 60, d: [16, 25, 49] },

  { id: "oo-05", family: "oddone", minAge: 13, maxAge: 99,
    q: "Which does NOT belong? Mercury, Venus, Moon, Mars",
    a: "Moon", d: ["Mercury", "Venus", "Mars"] },

  { id: "oo-06", family: "oddone", minAge: 13, maxAge: 99,
    q: "Which does NOT belong? 5, 7, 11, 15, 17",
    a: 15, d: [5, 11, 17] },

  { id: "oo-07", family: "oddone", minAge: 13, maxAge: 99,
    q: "Which does NOT belong? Oak, Maple, Rose, Pine",
    a: "Rose", d: ["Oak", "Maple", "Pine"] },

  { id: "oo-08", family: "oddone", minAge: 13, maxAge: 99,
    q: "Which does NOT belong? Piano, Guitar, Drum, Violin",
    a: "Drum", d: ["Piano", "Guitar", "Violin"] },

  { id: "oo-09", family: "oddone", minAge: 16, maxAge: 99,
    q: "Which does NOT belong? 121, 144, 169, 180, 196",
    a: 180, d: [121, 144, 169] },

  /* ═══ Time, age, and clock problems ═══ */

  { id: "ta-01", family: "timeage", minAge: 13, maxAge: 99,
    q: "A clock loses 15 minutes every hour. If it is set correctly at noon, what time does it show at 4 pm?",
    a: "3:00 pm", d: ["3:30 pm", "3:45 pm", "4:00 pm"] },

  { id: "ta-02", family: "timeage", minAge: 13, maxAge: 99,
    q: "What is the angle between the hour hand and the minute hand at exactly 3:00?",
    a: "90°", d: ["60°", "120°", "180°"] },

  { id: "ta-03", family: "timeage", minAge: 13, maxAge: 99,
    q: "In 5 years I will be twice as old as I was 5 years ago. How old am I now?",
    a: 15, d: [10, 20, 12] },

  { id: "ta-04", family: "timeage", minAge: 13, maxAge: 99,
    q: "If today is Wednesday, what day will it be 100 days from today?",
    a: "Friday", d: ["Wednesday", "Thursday", "Saturday"] },

  { id: "ta-05", family: "timeage", minAge: 13, maxAge: 99,
    q: "A clock reads 9:00. How many degrees has the hour hand moved since midnight?",
    a: "270°", d: ["180°", "90°", "360°"] },

  { id: "ta-06", family: "timeage", minAge: 16, maxAge: 99,
    q: "A boy is currently twice his sister's age. In 10 years, he will be 1.5 times her age. How old is the sister now?",
    a: 10, d: [8, 5, 15] },

  { id: "ta-07", family: "timeage", minAge: 16, maxAge: 99,
    q: "At roughly what time between 2:00 and 3:00 do the hour and minute hands overlap?",
    a: "about 2:11", d: ["2:00", "2:15", "2:30"] },

  { id: "ta-08", family: "timeage", minAge: 13, maxAge: 99,
    q: "A movie is 2 hours and 20 minutes long and starts at 6:10 pm. What time does it end?",
    a: "8:30 pm", d: ["8:20 pm", "9:00 pm", "8:10 pm"] },

  /* ═══ Pattern / code — substitution and mapping puzzles ═══ */

  { id: "pc-01", family: "pattern", minAge: 13, maxAge: 99,
    q: "If A=1, B=2, … Z=26, what does the word MATH add up to?",
    a: 42, d: [40, 44, 38] },

  { id: "pc-02", family: "pattern", minAge: 13, maxAge: 99,
    q: "If 1→A, 2→B, 3→C, … what word is 8-5-12-12-15?",
    a: "HELLO", d: ["HALLO", "HOLLA", "HELOO"] },

  { id: "pc-03", family: "pattern", minAge: 16, maxAge: 99,
    q: "If TABLE is written as UBCMF (each letter shifted by +1), how would CHAIR be written?",
    a: "DIBJS", d: ["DIBJT", "CIBIS", "DIAJR"] },

  { id: "pc-04", family: "pattern", minAge: 16, maxAge: 99,
    q: "A secret word is coded by shifting every letter forward 3 places. The code is RUDQJH. What is the original word?",
    a: "ORANGE", d: ["ORACLE", "ORANJE", "PURPLE"] },

  { id: "pc-05", family: "pattern", minAge: 16, maxAge: 99,
    q: "If 2 apples cost $1.20, and 3 apples plus 1 orange cost $2.40, how much is one orange?",
    a: "60¢", d: ["80¢", "40¢", "$1.20"] },

  { id: "pc-06", family: "pattern", minAge: 16, maxAge: 99,
    q: "If MON = 1, TUE = 2, WED = 3, …, what number does SAT map to?",
    a: 6, d: [7, 5, 4] },

];

/* ─── Runtime state & helpers ─────────────────────────────────────────── */

/* Session-wide dedup: ids already served this run.
   Module is re-loaded on every page load (cache-busted) so this resets
   naturally each test. */
const pickedThisSession = new Set();

/* An item is "in bracket" if its age window covers the target age */
function itemFitsAge(item, age) {
  const lo = item.minAge ?? 10;
  const hi = item.maxAge ?? 99;
  return age >= lo && age <= hi;
}

/* Count how many items per family the session has already used.
   Used to prefer under-represented families so the run feels varied. */
function familyUsageCount(ids) {
  const counts = {};
  for (const id of ids) {
    const it = POOL.find(p => p.id === id);
    if (!it) continue;
    counts[it.family] = (counts[it.family] || 0) + 1;
  }
  return counts;
}

/* ─── Public API ──────────────────────────────────────────────────────── */

export function generate(rng) {
  const age = Number(sessionStorage.getItem("iq_user_age")) || 14;

  /* Filter: age-appropriate AND not yet served this session */
  let candidates = POOL.filter(p =>
    itemFitsAge(p, age) && !pickedThisSession.has(p.id)
  );

  /* If the age-filtered pool is exhausted, relax the age filter before we
     allow repeats — better to stretch than to repeat. */
  if (candidates.length === 0) {
    candidates = POOL.filter(p => !pickedThisSession.has(p.id));
  }
  /* Truly exhausted — reset and pick from the age-fit pool again */
  if (candidates.length === 0) {
    pickedThisSession.clear();
    candidates = POOL.filter(p => itemFitsAge(p, age));
    if (candidates.length === 0) candidates = POOL.slice();
  }

  /* Prefer under-represented families to keep the run varied */
  const familyCounts = familyUsageCount([...pickedThisSession]);
  const minCount = Math.min(...candidates.map(p => familyCounts[p.family] || 0));
  const leastUsed = candidates.filter(p => (familyCounts[p.family] || 0) === minCount);

  const item = rng.pick(leastUsed);
  pickedThisSession.add(item.id);

  /* Build and shuffle the 4 options */
  const optionValues = rng.shuffle([item.a, ...item.d].map(v => String(v)));
  const correctIndex = optionValues.indexOf(String(item.a));

  let answer = null;

  return {
    type: "problem",
    category: CATEGORY[item.family] || "Problem",
    prompt: promptForFamily(item.family),

    render() {
      const opts = optionValues.map((val, i) => `
        <button type="button" class="option option--text reveal" style="--i:${i}" data-idx="${i}">
          <span class="option__label">${String.fromCharCode(65 + i)}</span>
          <span class="option__text">${escapeHtml(val)}</span>
        </button>
      `).join("");
      return `
        <div class="ps-wrap">
          <p class="ps-problem">${escapeHtml(item.q)}</p>
          <div class="options options--4 options--text-grid">${opts}</div>
        </div>
      `;
    },

    attach(root, onAnswer) {
      root.querySelectorAll(".option").forEach(btn => {
        btn.addEventListener("click", () => {
          root.querySelectorAll(".option").forEach(b => b.classList.remove("option--selected"));
          btn.classList.add("option--selected");
          answer = Number(btn.dataset.idx);
          onAnswer(answer);
        });
      });
    },

    restore(root, { answer: savedAnswer } = {}) {
      const a = savedAnswer ?? answer;
      if (a === null || a === undefined) return;
      const btn = root.querySelector(`.option[data-idx="${a}"]`);
      if (btn) btn.classList.add("option--selected");
    },

    getAnswer:     () => answer,
    hasAnswer:     () => answer !== null,
    evaluate:      (a) => a === correctIndex,
    correctAnswer: () => correctIndex,
  };
}

/* Family-specific framing for the question prompt bar. Kept short — the
   real content lives in the item.q body. */
function promptForFamily(family) {
  switch (family) {
    case "arithmetic":  return "Work it out carefully.";
    case "wordproblem": return "Read the problem and work out the answer.";
    case "sequence":    return "Find the rule, then the next number.";
    case "letterseq":   return "Find the pattern, then what comes next.";
    case "analogy":     return "Find the same relationship.";
    case "trick":       return "Read every word before you answer.";
    case "deduction":   return "Work out what must logically follow.";
    case "oddone":      return "Which one does not fit with the others?";
    case "timeage":     return "Think carefully about the setup.";
    case "pattern":     return "Work out the rule, then apply it.";
    default:            return "Pick the correct answer.";
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* Exposed for callers that want to know how many unique items are
   available for a given age (e.g. to bound the test length). */
export function poolSizeForAge(age) {
  return POOL.filter(p => itemFitsAge(p, age)).length;
}
