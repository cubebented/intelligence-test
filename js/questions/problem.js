/* ═══════════════════════════════════════════════════════════════════════
   Unified "problem" engine — replaces the 20 separate question types.
   Every question is a short multiple-choice problem; variety comes from
   the underlying POOL which covers arithmetic, sequences, classic IQ
   trick questions, analogies, deductive logic, time/age puzzles, etc.

   Each POOL item:
     { id, family, q, a, d:[3 distractors], minAge, maxAge, hint? }

   Generation:
     • Reads `iq_user_age` from sessionStorage.
     • Filters the pool to items whose [minAge..maxAge] covers the user.
     • Picks one item via rng.pick, avoiding any id already picked this
       session (module-level Set — reset on page load = fresh test).
     • Shuffles the four options via rng.shuffle.

   The display categories (family → Category name) let the AI analyst
   group items by cognitive flavour when it reads the session record.
   ═══════════════════════════════════════════════════════════════════════ */

/* Display category names per family */
const CATEGORY = {
  arithmetic:      "Arithmetic",
  wordproblem:     "Word Problem",
  sequence:        "Number Sequence",
  letterseq:       "Letter Sequence",
  analogy:         "Analogy",
  trick:           "Trick Question",
  deduction:       "Deduction",
  oddone:          "Odd One Out",
  timeage:         "Time & Age",
  pattern:         "Pattern Code",
};

/* ─────────────────────────── THE POOL ───────────────────────────────────
   ~120 items spanning age brackets. The age tags are inclusive.
   Distractors are hand-picked "plausibly wrong" — each is the answer the
   user would land on via a specific common mistake (off-by-one, wrong
   operation, taking the question too literally, etc.) so guessing is
   genuinely hard.

   Ages used:
     10–12  elementary    |   13–15  middle-school
     16–18  high-school   |   19+   adult

   A couple conventions:
     • `q` is the full question text. No surrounding label — the prompt
       on the question screen supplies the framing ("Problem:" etc).
     • `a` and `d[]` are display strings. Numbers are auto-stringified;
       strings are rendered verbatim.
   ─────────────────────────────────────────────────────────────────────── */
const POOL = [

  /* ═══ Arithmetic (mental math, scales across age) ═══ */
  { id: "ar-01", family: "arithmetic", minAge: 10, maxAge: 99,
    q: "What is 18 × 6?",
    a: 108, d: [104, 118, 96] },
  { id: "ar-02", family: "arithmetic", minAge: 10, maxAge: 99,
    q: "What is 144 ÷ 12?",
    a: 12, d: [14, 11, 13] },
  { id: "ar-03", family: "arithmetic", minAge: 10, maxAge: 99,
    q: "What is 25% of 80?",
    a: 20, d: [25, 40, 16] },
  { id: "ar-04", family: "arithmetic", minAge: 10, maxAge: 99,
    q: "What is 7 × 8 − 6?",
    a: 50, d: [56, 48, 62] },
  { id: "ar-05", family: "arithmetic", minAge: 13, maxAge: 99,
    q: "What is 3/4 of 60?",
    a: 45, d: [40, 50, 20] },
  { id: "ar-06", family: "arithmetic", minAge: 13, maxAge: 99,
    q: "What is the square root of 169?",
    a: 13, d: [12, 14, 17] },
  { id: "ar-07", family: "arithmetic", minAge: 13, maxAge: 99,
    q: "What is 15% of 260?",
    a: 39, d: [36, 42, 26] },
  { id: "ar-08", family: "arithmetic", minAge: 16, maxAge: 99,
    q: "What is 2³ × 3²?",
    a: 72, d: [36, 64, 144] },
  { id: "ar-09", family: "arithmetic", minAge: 16, maxAge: 99,
    q: "What is (17 + 23) × 4 ÷ 8?",
    a: 20, d: [17, 24, 10] },
  { id: "ar-10", family: "arithmetic", minAge: 10, maxAge: 99,
    q: "What is 9 × 11?",
    a: 99, d: [101, 88, 121] },
  { id: "ar-11", family: "arithmetic", minAge: 10, maxAge: 99,
    q: "Which number is halfway between 14 and 42?",
    a: 28, d: [26, 30, 21] },
  { id: "ar-12", family: "arithmetic", minAge: 13, maxAge: 99,
    q: "If x + 7 = 19, what is x?",
    a: 12, d: [11, 14, 26] },
  { id: "ar-13", family: "arithmetic", minAge: 13, maxAge: 99,
    q: "If 2x = 18, what is x?",
    a: 9, d: [8, 10, 16] },
  { id: "ar-14", family: "arithmetic", minAge: 16, maxAge: 99,
    q: "If 3x − 4 = 20, what is x?",
    a: 8, d: [7, 9, 5] },

  /* ═══ Word problems (real-world, multi-step) ═══ */
  { id: "wp-01", family: "wordproblem", minAge: 10, maxAge: 99,
    q: "Maya has 24 stickers. She gives one third to her brother and 6 more to her friend. How many does she have left?",
    a: 10, d: [8, 12, 14] },
  { id: "wp-02", family: "wordproblem", minAge: 10, maxAge: 99,
    q: "A box of 48 pencils is shared equally among 6 classmates. How many pencils does each get?",
    a: 8, d: [6, 7, 9] },
  { id: "wp-03", family: "wordproblem", minAge: 10, maxAge: 99,
    q: "Noah reads 12 pages before dinner and 9 pages after. His book has 50 pages. How many pages are left?",
    a: 29, d: [21, 31, 38] },
  { id: "wp-04", family: "wordproblem", minAge: 10, maxAge: 99,
    q: "Lily buys a book for $12 and a pen for $3. She pays with a $20 bill. How much change does she get?",
    a: "$5", d: ["$9", "$8", "$15"] },
  { id: "wp-05", family: "wordproblem", minAge: 10, maxAge: 99,
    q: "A school bus has 40 seats. 28 children get on at the first stop, 9 more at the second. How many empty seats are left?",
    a: 3, d: [12, 19, 37] },
  { id: "wp-06", family: "wordproblem", minAge: 10, maxAge: 99,
    q: "There are 15 red apples and twice as many green apples in a basket. How many apples in total?",
    a: 45, d: [30, 35, 60] },
  { id: "wp-07", family: "wordproblem", minAge: 13, maxAge: 99,
    q: "A rectangle is 8 cm long and 3 cm wide. What is its area, in square centimetres?",
    a: 24, d: [11, 22, 16] },
  { id: "wp-08", family: "wordproblem", minAge: 13, maxAge: 99,
    q: "Aria has 3 times as many marbles as Ben. Together they have 36 marbles. How many does Ben have?",
    a: 9, d: [12, 27, 18] },
  { id: "wp-09", family: "wordproblem", minAge: 13, maxAge: 99,
    q: "You double a number, then add 6. The result is 20. What was the number?",
    a: 7, d: [13, 10, 8] },
  { id: "wp-10", family: "wordproblem", minAge: 13, maxAge: 99,
    q: "A shop sells apples 3 for $2. How much do 12 apples cost?",
    a: "$8", d: ["$6", "$24", "$4"] },
  { id: "wp-11", family: "wordproblem", minAge: 13, maxAge: 99,
    q: "A square has a perimeter of 32 cm. What is the length of one side?",
    a: "8 cm", d: ["4 cm", "16 cm", "32 cm"] },
  { id: "wp-12", family: "wordproblem", minAge: 16, maxAge: 99,
    q: "A shirt is 20% off its $45 price. What does it cost now?",
    a: "$36", d: ["$25", "$40", "$9"] },
  { id: "wp-13", family: "wordproblem", minAge: 16, maxAge: 99,
    q: "Two numbers add to 40 and differ by 6. What is the smaller number?",
    a: 17, d: [16, 23, 18] },
  { id: "wp-14", family: "wordproblem", minAge: 16, maxAge: 99,
    q: "A car travels 240 km in 3 hours. At the same rate, how far does it go in 5 hours?",
    a: "400 km", d: ["360 km", "450 km", "380 km"] },
  { id: "wp-15", family: "wordproblem", minAge: 16, maxAge: 99,
    q: "If 5 workers build a wall in 8 days, how many days would 8 workers take?",
    a: 5, d: [4, 6, 10] },
  { id: "wp-16", family: "wordproblem", minAge: 16, maxAge: 99,
    q: "A bag has 3 red, 5 blue and 2 green marbles. One is drawn at random. What is the probability it is blue?",
    a: "1/2", d: ["1/5", "2/5", "3/10"] },

  /* ═══ Number sequences — find the next ═══ */
  { id: "ns-01", family: "sequence", minAge: 10, maxAge: 99,
    q: "What comes next? 2, 4, 8, 16, __",
    a: 32, d: [24, 18, 20] },
  { id: "ns-02", family: "sequence", minAge: 10, maxAge: 99,
    q: "What comes next? 3, 6, 9, 12, __",
    a: 15, d: [14, 18, 16] },
  { id: "ns-03", family: "sequence", minAge: 10, maxAge: 99,
    q: "What comes next? 1, 4, 9, 16, __",
    a: 25, d: [20, 24, 32] },
  { id: "ns-04", family: "sequence", minAge: 10, maxAge: 99,
    q: "What comes next? 100, 90, 81, 73, __",
    a: 66, d: [65, 64, 67] },
  { id: "ns-05", family: "sequence", minAge: 13, maxAge: 99,
    q: "What comes next? 1, 1, 2, 3, 5, 8, __",
    a: 13, d: [11, 10, 16] },
  { id: "ns-06", family: "sequence", minAge: 13, maxAge: 99,
    q: "What comes next? 2, 6, 12, 20, 30, __",
    a: 42, d: [40, 36, 44] },
  { id: "ns-07", family: "sequence", minAge: 13, maxAge: 99,
    q: "What comes next? 81, 27, 9, 3, __",
    a: 1, d: [0, 2, 3] },
  { id: "ns-08", family: "sequence", minAge: 13, maxAge: 99,
    q: "What is the missing number? 7, 14, __, 28, 35",
    a: 21, d: [20, 18, 24] },
  { id: "ns-09", family: "sequence", minAge: 16, maxAge: 99,
    q: "What comes next? 2, 3, 5, 7, 11, __",
    a: 13, d: [12, 14, 15] },
  { id: "ns-10", family: "sequence", minAge: 16, maxAge: 99,
    q: "What comes next? 1, 8, 27, 64, __",
    a: 125, d: [100, 128, 81] },
  { id: "ns-11", family: "sequence", minAge: 16, maxAge: 99,
    q: "What comes next? 2, 5, 10, 17, 26, __",
    a: 37, d: [35, 36, 38] },
  { id: "ns-12", family: "sequence", minAge: 13, maxAge: 99,
    q: "What comes next? 50, 45, 40, 35, __",
    a: 30, d: [25, 32, 28] },

  /* ═══ Letter sequences ═══ */
  { id: "ls-01", family: "letterseq", minAge: 12, maxAge: 99,
    q: "What comes next? A, C, E, G, __",
    a: "I", d: ["H", "J", "K"] },
  { id: "ls-02", family: "letterseq", minAge: 12, maxAge: 99,
    q: "What comes next? B, D, G, K, __",
    a: "P", d: ["O", "Q", "N"] },
  { id: "ls-03", family: "letterseq", minAge: 12, maxAge: 99,
    q: "What comes next? Z, X, V, T, __",
    a: "R", d: ["S", "Q", "P"] },
  { id: "ls-04", family: "letterseq", minAge: 14, maxAge: 99,
    q: "What comes next? AZ, BY, CX, DW, __",
    a: "EV", d: ["EU", "FV", "DV"] },
  { id: "ls-05", family: "letterseq", minAge: 14, maxAge: 99,
    q: "Which day comes next? Monday, Wednesday, Friday, __",
    a: "Sunday", d: ["Saturday", "Tuesday", "Thursday"] },
  { id: "ls-06", family: "letterseq", minAge: 14, maxAge: 99,
    q: "Which month comes next? January, March, May, __",
    a: "July", d: ["June", "August", "April"] },

  /* ═══ Analogies ═══ */
  { id: "an-01", family: "analogy", minAge: 10, maxAge: 99,
    q: "Bird is to fly as fish is to __?",
    a: "swim", d: ["breathe", "jump", "crawl"] },
  { id: "an-02", family: "analogy", minAge: 10, maxAge: 99,
    q: "Hand is to glove as foot is to __?",
    a: "shoe", d: ["sock", "toe", "leg"] },
  { id: "an-03", family: "analogy", minAge: 10, maxAge: 99,
    q: "Hot is to cold as tall is to __?",
    a: "short", d: ["big", "wide", "heavy"] },
  { id: "an-04", family: "analogy", minAge: 12, maxAge: 99,
    q: "Pen is to writer as brush is to __?",
    a: "painter", d: ["artist-hand", "canvas", "teacher"] },
  { id: "an-05", family: "analogy", minAge: 12, maxAge: 99,
    q: "Chicken is to egg as cow is to __?",
    a: "calf", d: ["milk", "grass", "farm"] },
  { id: "an-06", family: "analogy", minAge: 12, maxAge: 99,
    q: "Doctor is to hospital as teacher is to __?",
    a: "school", d: ["student", "book", "desk"] },
  { id: "an-07", family: "analogy", minAge: 12, maxAge: 99,
    q: "Finger is to hand as leaf is to __?",
    a: "tree", d: ["plant", "branch", "root"] },
  { id: "an-08", family: "analogy", minAge: 14, maxAge: 99,
    q: "Water is to ice as steam is to __?",
    a: "water", d: ["fog", "cloud", "heat"] },
  { id: "an-09", family: "analogy", minAge: 14, maxAge: 99,
    q: "Thermometer is to temperature as clock is to __?",
    a: "time", d: ["hour", "second", "alarm"] },
  { id: "an-10", family: "analogy", minAge: 14, maxAge: 99,
    q: "Author is to novel as composer is to __?",
    a: "symphony", d: ["song", "piano", "orchestra"] },
  { id: "an-11", family: "analogy", minAge: 14, maxAge: 99,
    q: "Kitten is to cat as puppy is to __?",
    a: "dog", d: ["pet", "bone", "bark"] },
  { id: "an-12", family: "analogy", minAge: 16, maxAge: 99,
    q: "Library is to books as gallery is to __?",
    a: "paintings", d: ["statues", "artists", "walls"] },

  /* ═══ Classic IQ-test trick questions ═══
     The most common "second-try guessable" risk lives here, so every
     trick has a distractor that is the *literal* answer the person gives
     before thinking. */
  { id: "tr-01", family: "trick", minAge: 12, maxAge: 99,
    q: "Emily's mother has four daughters: April, May, June, and __?",
    a: "Emily", d: ["July", "August", "March"] },
  { id: "tr-02", family: "trick", minAge: 12, maxAge: 99,
    q: "There are 12 fish in a tank. Half of them drown. How many are left?",
    a: 12, d: [6, 0, 10] },
  { id: "tr-03", family: "trick", minAge: 12, maxAge: 99,
    q: "A farmer has 17 sheep. All but 9 die. How many are left?",
    a: 9, d: [8, 17, 26] },
  { id: "tr-04", family: "trick", minAge: 12, maxAge: 99,
    q: "You are running a race and you pass the person in 2nd place. What place are you in now?",
    a: "2nd", d: ["1st", "3rd", "4th"] },
  { id: "tr-05", family: "trick", minAge: 12, maxAge: 99,
    q: "How many months of the year have 28 days?",
    a: 12, d: [1, 4, 2] },
  { id: "tr-06", family: "trick", minAge: 12, maxAge: 99,
    q: "A doctor gives you 3 pills and tells you to take one every half hour. How long until you finish them?",
    a: "1 hour", d: ["1.5 hours", "30 minutes", "2 hours"] },
  { id: "tr-07", family: "trick", minAge: 14, maxAge: 99,
    q: "Before Mt. Everest was discovered, which mountain was the tallest on Earth?",
    a: "Mt. Everest", d: ["K2", "Mt. Kilimanjaro", "Mt. McKinley"] },
  { id: "tr-08", family: "trick", minAge: 14, maxAge: 99,
    q: "A plane crashes exactly on the US–Canada border. Where should the survivors be buried?",
    a: "Survivors aren't buried", d: ["United States", "Canada", "On the border"] },
  { id: "tr-09", family: "trick", minAge: 12, maxAge: 99,
    q: "Which weighs more: a pound of feathers or a pound of bricks?",
    a: "They weigh the same", d: ["The bricks", "The feathers", "Can't be answered"] },
  { id: "tr-10", family: "trick", minAge: 12, maxAge: 99,
    q: "How can a man go eight days without sleep?",
    a: "He sleeps at night", d: ["He drinks coffee", "It's impossible", "He takes naps"] },
  { id: "tr-11", family: "trick", minAge: 14, maxAge: 99,
    q: "A man builds a rectangular house with four sides, each facing south. A bear walks past. What colour is the bear?",
    a: "White", d: ["Brown", "Black", "Grey"] },
  { id: "tr-12", family: "trick", minAge: 12, maxAge: 99,
    q: "If a rooster lays an egg on the peak of a roof, which side does the egg roll down?",
    a: "Roosters don't lay eggs", d: ["The steeper side", "Either side", "Neither — it balances"] },
  { id: "tr-13", family: "trick", minAge: 12, maxAge: 99,
    q: "What has hands but cannot clap?",
    a: "A clock", d: ["A mannequin", "A statue", "A painting"] },
  { id: "tr-14", family: "trick", minAge: 14, maxAge: 99,
    q: "Take 2 apples from 3 apples. How many do you have?",
    a: 2, d: [1, 3, 0] },
  { id: "tr-15", family: "trick", minAge: 12, maxAge: 99,
    q: "A father and son are in a car crash. The father dies. At the hospital the surgeon says, \"I can't operate on him — he's my son!\" How is this possible?",
    a: "The surgeon is his mother", d: ["He was adopted", "The son has two fathers", "It's a mistake"] },

  /* ═══ Deduction — syllogisms and conditional logic ═══ */
  { id: "dd-01", family: "deduction", minAge: 14, maxAge: 99,
    q: "All birds lay eggs. A robin is a bird. Which statement must be true?",
    a: "A robin lays eggs.", d: ["All egg-layers are birds.", "Only birds lay eggs.", "Some birds don't lay eggs."] },
  { id: "dd-02", family: "deduction", minAge: 14, maxAge: 99,
    q: "All squares are rectangles. All rectangles are shapes. Therefore:",
    a: "All squares are shapes.", d: ["All shapes are squares.", "All rectangles are squares.", "Some shapes are squares but none are rectangles."] },
  { id: "dd-03", family: "deduction", minAge: 14, maxAge: 99,
    q: "If it rains, the ground gets wet. The ground is wet. Which must be true?",
    a: "None of these must be true.", d: ["It rained.", "It did not rain.", "It always rains when the ground is wet."] },
  { id: "dd-04", family: "deduction", minAge: 16, maxAge: 99,
    q: "No cats are dogs. Some pets are cats. Therefore:",
    a: "Some pets are not dogs.", d: ["No pets are dogs.", "Some pets are dogs.", "All pets are cats."] },
  { id: "dd-05", family: "deduction", minAge: 16, maxAge: 99,
    q: "Only students over 16 can drive. Mia is 15. Which must be true?",
    a: "Mia cannot drive yet.", d: ["Mia will never drive.", "Mia drives.", "Mia is not a student."] },
  { id: "dd-06", family: "deduction", minAge: 14, maxAge: 99,
    q: "If A > B and B > C, which is true?",
    a: "A > C", d: ["A < C", "A = C", "Can't be known"] },
  { id: "dd-07", family: "deduction", minAge: 16, maxAge: 99,
    q: "Every book in the library is either fiction or non-fiction. This book is not fiction. Therefore:",
    a: "It is non-fiction.", d: ["It is not in the library.", "It is both.", "Can't be determined."] },
  { id: "dd-08", family: "deduction", minAge: 16, maxAge: 99,
    q: "All roses are flowers. Some flowers fade quickly. Therefore:",
    a: "Some roses MAY fade quickly.", d: ["All roses fade quickly.", "No roses fade quickly.", "Only roses fade quickly."] },

  /* ═══ Odd-one-out (text-based) ═══ */
  { id: "oo-01", family: "oddone", minAge: 10, maxAge: 99,
    q: "Which one does NOT belong? dog, cat, lion, table",
    a: "table", d: ["dog", "cat", "lion"] },
  { id: "oo-02", family: "oddone", minAge: 10, maxAge: 99,
    q: "Which one does NOT belong? red, green, loud, blue",
    a: "loud", d: ["red", "green", "blue"] },
  { id: "oo-03", family: "oddone", minAge: 12, maxAge: 99,
    q: "Which one does NOT belong? apple, banana, carrot, grape",
    a: "carrot", d: ["apple", "banana", "grape"] },
  { id: "oo-04", family: "oddone", minAge: 12, maxAge: 99,
    q: "Which one does NOT belong? circle, square, triangle, cube",
    a: "cube", d: ["circle", "square", "triangle"] },
  { id: "oo-05", family: "oddone", minAge: 12, maxAge: 99,
    q: "Which one does NOT belong? rose, tulip, oak, daisy",
    a: "oak", d: ["rose", "tulip", "daisy"] },
  { id: "oo-06", family: "oddone", minAge: 14, maxAge: 99,
    q: "Which number does NOT belong? 9, 16, 25, 30",
    a: 30, d: [9, 16, 25] },
  { id: "oo-07", family: "oddone", minAge: 14, maxAge: 99,
    q: "Which does NOT belong? sparrow, eagle, bat, pigeon",
    a: "bat", d: ["sparrow", "eagle", "pigeon"] },
  { id: "oo-08", family: "oddone", minAge: 16, maxAge: 99,
    q: "Which does NOT belong? Mercury, Venus, Moon, Mars",
    a: "Moon", d: ["Mercury", "Venus", "Mars"] },

  /* ═══ Time / age / clock ═══ */
  { id: "ta-01", family: "timeage", minAge: 10, maxAge: 99,
    q: "A clock shows 3:00. How many minutes until the minute hand points to 6?",
    a: 30, d: [15, 45, 60] },
  { id: "ta-02", family: "timeage", minAge: 10, maxAge: 99,
    q: "A train leaves at 2:15 pm and arrives at 4:45 pm. How many minutes is the trip?",
    a: 150, d: [120, 130, 180] },
  { id: "ta-03", family: "timeage", minAge: 12, maxAge: 99,
    q: "I am 3 times as old as my sister. My sister is 4. How old am I?",
    a: 12, d: [7, 16, 15] },
  { id: "ta-04", family: "timeage", minAge: 12, maxAge: 99,
    q: "Jake is 4 years older than Mia. Mia is half their dad's age. Dad is 40. How old is Jake?",
    a: 24, d: [20, 16, 22] },
  { id: "ta-05", family: "timeage", minAge: 14, maxAge: 99,
    q: "If today is Wednesday, what day will it be 20 days from now?",
    a: "Tuesday", d: ["Monday", "Sunday", "Thursday"] },
  { id: "ta-06", family: "timeage", minAge: 14, maxAge: 99,
    q: "A movie is 2 hours and 20 minutes long. It starts at 6:10 pm. What time does it end?",
    a: "8:30 pm", d: ["8:20 pm", "9:00 pm", "8:10 pm"] },
  { id: "ta-07", family: "timeage", minAge: 16, maxAge: 99,
    q: "In 5 years, Sam will be twice as old as his brother. Sam is 13 now. How old is his brother now?",
    a: 4, d: [6, 9, 3] },
  { id: "ta-08", family: "timeage", minAge: 16, maxAge: 99,
    q: "What angle do the hands of a clock make at 3:00?",
    a: "90°", d: ["60°", "120°", "180°"] },
  { id: "ta-09", family: "timeage", minAge: 16, maxAge: 99,
    q: "A child is born in 2010. In 2028, how old will they be on their birthday?",
    a: 18, d: [17, 19, 20] },

  /* ═══ Pattern coding ═══ */
  { id: "pc-01", family: "pattern", minAge: 14, maxAge: 99,
    q: "If CAT is coded as 3-1-20, how is DOG coded?",
    a: "4-15-7", d: ["4-14-7", "3-15-7", "5-15-8"] },
  { id: "pc-02", family: "pattern", minAge: 14, maxAge: 99,
    q: "If 1 = A, 2 = B, 3 = C… what word is 8-5-12-12-15?",
    a: "HELLO", d: ["HALLO", "HELP!", "HELOO"] },
  { id: "pc-03", family: "pattern", minAge: 16, maxAge: 99,
    q: "If MON = 1, TUE = 2, WED = 3… what number is SAT?",
    a: 6, d: [7, 5, 4] },
  { id: "pc-04", family: "pattern", minAge: 16, maxAge: 99,
    q: "If BOOK is written as CPPL (+1 each letter), how is FISH written?",
    a: "GJTI", d: ["GJTJ", "GITI", "FJSI"] },
  { id: "pc-05", family: "pattern", minAge: 16, maxAge: 99,
    q: "If you shift each letter of CAT two places forward, you get:",
    a: "ECV", d: ["BZS", "CDU", "DBU"] },
];

/* ─── Runtime state & helpers ─────────────────────────────────────────── */

/* Session-wide dedup: ids already served this run.
   Module is re-loaded on every page load (cache-busted) so this resets
   naturally each test. */
const pickedThisSession = new Set();

function ageBracket(age) {
  if (age <= 12) return { min: 10, max: 12, label: "10-12" };
  if (age <= 15) return { min: 13, max: 15, label: "13-15" };
  if (age <= 18) return { min: 16, max: 18, label: "16-18" };
  return { min: 19, max: 99, label: "adult" };
}

/* An item is "in bracket" if its age window overlaps the target bracket */
function itemFitsAge(item, age) {
  const lo = item.minAge ?? 10;
  const hi = item.maxAge ?? 99;
  return age >= lo && age <= hi;
}

/* Family weight for a session — we *want* variety, so after picking one
   item from a family we gently down-weight the family for the next pick.
   Implemented by building the candidate list then shuffling + scoring. */
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

  /* Filter: age-appropriate AND not yet served */
  let candidates = POOL.filter(p =>
    itemFitsAge(p, age) && !pickedThisSession.has(p.id)
  );

  /* If the age-filtered pool is exhausted, relax the age filter before we
     allow dupes — better to show a slightly-hard question than repeat. */
  if (candidates.length === 0) {
    candidates = POOL.filter(p => !pickedThisSession.has(p.id));
  }
  /* Last-resort: everything used — reset and pick from the full pool */
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

  /* Build the 4-option list and shuffle */
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

/* Family-specific framing for the question prompt bar. Kept short and
   kid-readable — the real content is in the item.q body. */
function promptForFamily(family) {
  switch (family) {
    case "arithmetic":  return "Work out the answer.";
    case "wordproblem": return "Read the problem. Work out the answer.";
    case "sequence":    return "Find the next number in the sequence.";
    case "letterseq":   return "Find what comes next in the pattern.";
    case "analogy":     return "Pick the word that fits the pattern.";
    case "trick":       return "Read carefully, then pick the answer.";
    case "deduction":   return "Read the statements. Pick what must follow.";
    case "oddone":      return "Which one does not belong?";
    case "timeage":     return "Read the problem. Work out the answer.";
    case "pattern":     return "Work out the rule, then pick the answer.";
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
