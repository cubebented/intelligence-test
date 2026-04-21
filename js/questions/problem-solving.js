/* Problem Solving — age-10+ real-world word problems.
   Multi-step but self-contained: every problem uses ≤3 arithmetic operations
   on small whole numbers. The answer is always a small integer so the user
   can check by reasoning, not just calculation. Distractors are numbers the
   user would land on if they made a plausible mistake (forgot a step, used
   the wrong operation, off-by-one). */

/* Each item is:
     { q: "<word problem>", a: correctAnswer, d: [distractor, distractor, distractor] }
   d[0] is the "one-step-off" lure — the most common wrong answer. */
const ITEMS = [
  {
    q: "Maya has 24 stickers. She gives 1/3 to her brother and 6 to her best friend. How many does she have left?",
    a: 10, d: [8, 12, 14],
  },
  {
    q: "A box of 48 pencils is shared equally among 6 classmates. Three of them put their pencils back. How many pencils are the rest still holding?",
    a: 24, d: [18, 30, 36],
  },
  {
    q: "Noah reads 12 pages before dinner and 9 pages after. His book has 50 pages. How many pages are left?",
    a: 29, d: [21, 31, 38],
  },
  {
    q: "A pizza is cut into 8 slices. Four friends eat 1 slice each, then share 2 more slices equally. How many slices are left?",
    a: 2, d: [4, 0, 3],
  },
  {
    q: "Sam saves $3 every week. How many weeks will it take him to save $24?",
    a: 8, d: [7, 9, 21],
  },
  {
    q: "A school bus has 40 seats. 28 children get on at the first stop, 9 more at the second. How many empty seats are left?",
    a: 3, d: [12, 19, 37],
  },
  {
    q: "Lily buys a book for $12 and a pen for $3. She pays with a $20 bill. How much change does she get?",
    a: 5, d: [9, 8, 15],
  },
  {
    q: "There are 15 red apples and twice as many green apples in a basket. How many apples are there in total?",
    a: 45, d: [30, 35, 60],
  },
  {
    q: "A train leaves at 2:15 pm and arrives at 4:45 pm. How many minutes is the ride?",
    a: 150, d: [120, 130, 180],
  },
  {
    q: "Mia's garden has 5 rows of 6 tulips each. A deer eats 8 of them. How many tulips are left?",
    a: 22, d: [24, 18, 30],
  },
  {
    q: "A bottle holds 750 ml of juice. You pour out three 150-ml glasses. How many ml are left in the bottle?",
    a: 300, d: [450, 250, 600],
  },
  {
    q: "Jake is 4 years older than his sister. His sister is half his dad's age. If their dad is 40, how old is Jake?",
    a: 24, d: [20, 16, 22],
  },
  {
    q: "A rectangle is 8 cm long and 3 cm wide. What is its area, in square centimetres?",
    a: 24, d: [11, 22, 16],
  },
  {
    q: "A concert ticket costs $18. A group buys 5 tickets and uses a $15 discount. How much do they pay?",
    a: 75, d: [90, 60, 105],
  },
  {
    q: "Aria has 3 times as many marbles as Ben. Together they have 36 marbles. How many does Ben have?",
    a: 9, d: [12, 27, 18],
  },
  {
    q: "A baker makes 72 cookies. She boxes them in groups of 8. Then she gives 3 boxes away. How many cookies are left?",
    a: 48, d: [24, 56, 64],
  },
  {
    /* Times encoded as 24h HHMM so the formatter below correctly emits "pm".
       6:10pm + 2h20m = 8:30pm → 2030. Distractors are plausible mistakes. */
    q: "A movie is 2 hours and 20 minutes long. If it starts at 6:10 pm, what time does it end?",
    a: 2030, d: [2020, 2100, 2010],
  },
  {
    q: "Ten friends share 3 pizzas cut into 8 slices each. Each person takes 2 slices. How many slices are left over?",
    a: 4, d: [6, 0, 8],
  },
  {
    q: "A plant grows 2 cm every week. It is 15 cm tall today. How tall will it be in 5 weeks?",
    a: 25, d: [20, 17, 30],
  },
  {
    q: "There are 36 students in a class. One third are wearing blue. How many are NOT wearing blue?",
    a: 24, d: [12, 18, 30],
  },
  {
    q: "A farmer has 5 chickens and 3 cows. How many legs are there altogether?",
    a: 22, d: [16, 20, 24],
  },
  {
    q: "You double a number, then add 6. The result is 20. What was the number?",
    a: 7, d: [13, 10, 8],
  },
  {
    q: "A school assembly has 4 rows of 12 chairs plus 8 extra chairs at the back. How many chairs in total?",
    a: 56, d: [48, 64, 44],
  },
  {
    q: "An aquarium has 18 fish. Half are goldfish. One third of the rest are blue. How many blue fish are there?",
    a: 3, d: [6, 9, 2],
  },
  {
    q: "A runner does 4 laps around a 400-metre track. How many kilometres has she run?",
    a: 1.6, d: [1.2, 2.0, 4.0],
  },
  {
    q: "Tickets cost $9 for kids and $14 for adults. 2 adults and 3 kids go. What's the total?",
    a: 55, d: [46, 60, 50],
  },
  {
    q: "If today is Wednesday, what day of the week will it be in 20 days?",
    a: 0, /* Tuesday — index via day map below */ d: [1, 2, 3],
  },
  {
    q: "A rope is 72 cm long. You cut it into 6 equal pieces, then throw one away. What is the total length of the pieces you kept?",
    a: 60, d: [12, 66, 48],
  },
  {
    q: "A shop sells apples 3 for $2. How much do 12 apples cost?",
    a: 8, d: [6, 24, 4],
  },
  {
    q: "A square has a perimeter of 32 cm. What is the length of one side?",
    a: 8, d: [4, 16, 32],
  },
];

/* Format a numeric answer for display. Integers render as-is; fractionals
   (e.g. 1.6 km) stay with their decimal. Special encodings (times,
   day-of-week indices) are handled in `generate` below before getting here. */
function formatNum(n) {
  return String(n);
}

export function generate(rng) {
  const item = rng.pick(ITEMS);

  /* Special formatters: the movie item stores HHMM, the day-of-week item
     stores day indices. Convert both to readable strings before shuffling so
     the options list compares by final string. */
  let correct, distractors;
  if (item.q.startsWith("A movie is 2 hours")) {
    const fmt = (t) => {
      const h = Math.floor(t / 100), m = t % 100;
      const ampm = h >= 12 ? "pm" : "am";
      const h12 = ((h + 11) % 12) + 1;
      return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    };
    correct     = fmt(item.a);
    distractors = item.d.map(fmt);
  } else if (item.q.startsWith("If today is Wednesday")) {
    /* 0 = Tue (correct for +20 from Wed), then distractors near it.
       We've stored offsets as 0..3 — convert to day names. */
    const days = ["Tuesday", "Monday", "Sunday", "Thursday"];
    correct     = days[item.a];
    distractors = item.d.map(i => days[i]);
  } else {
    correct     = formatNum(item.a);
    distractors = item.d.map(formatNum);
  }

  const options = rng.shuffle([correct, ...distractors]);
  const correctIndex = options.indexOf(correct);

  let answer = null;

  return {
    type: "problem-solving",
    category: "Problem Solving",
    prompt: "Read the word problem. Work out the answer.",

    render() {
      const opts = options.map((val, i) => `
        <button type="button" class="option option--text reveal" style="--i:${i}" data-idx="${i}">
          <span class="option__label">${String.fromCharCode(65 + i)}</span>
          <span class="option__text">${val}</span>
        </button>
      `).join("");
      return `
        <div class="ps-wrap">
          <p class="ps-problem">${item.q}</p>
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

    getAnswer: () => answer,
    hasAnswer: () => answer !== null,
    evaluate: (a) => a === correctIndex,
    correctAnswer: () => correctIndex,
  };
}
