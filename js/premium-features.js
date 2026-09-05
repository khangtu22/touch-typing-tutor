/**
 * premium-features.js
 * ---------------------------------------------------------------------------
 * Data and utilities that power KeyFlow's premium content:
 *   • QUOTE_VAULT        – 60+ categorised, difficulty-tagged quotations
 *   • MULTI_LANG_WORDS   – Common word/sentence lists for EN, ES, FR, DE, IT, PT
 *   • getQuoteOfTheDay() – Deterministic daily quote picker (date-seeded)
 *   • getQuotesByFilter()– Filter QUOTE_VAULT by category and/or difficulty
 *   • generateLanguagePractice() – Build a CustomPracticeManager-compatible lesson
 * ---------------------------------------------------------------------------
 */

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE VAULT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Quote
 * @property {number}  id         - Unique numeric identifier
 * @property {string}  text       - The quote body
 * @property {string}  author     - Author name
 * @property {string}  category   - 'motivation' | 'literature' | 'programming' | 'science' | 'philosophy'
 * @property {string}  difficulty - 'short' (<80 chars) | 'medium' (80-200 chars) | 'long' (200+ chars)
 */

/** @type {Quote[]} */
export const QUOTE_VAULT = [

  // ── MOTIVATION (ids 1-14) ─────────────────────────────────────────────────

  {
    id: 1,
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
    category: "motivation",
    difficulty: "short",
  },
  {
    id: 2,
    text: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
    category: "motivation",
    difficulty: "medium",
  },
  {
    id: 3,
    text: "Our greatest glory is not in never falling, but in rising every time we fall.",
    author: "Confucius",
    category: "motivation",
    difficulty: "medium",
  },
  {
    id: 4,
    text: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
    category: "motivation",
    difficulty: "short",
  },
  {
    id: 5,
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
    category: "motivation",
    difficulty: "medium",
  },
  {
    id: 6,
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    category: "motivation",
    difficulty: "short",
  },
  {
    id: 7,
    text: "In the middle of every difficulty lies opportunity.",
    author: "Albert Einstein",
    category: "motivation",
    difficulty: "short",
  },
  {
    id: 8,
    text: "Twenty years from now you will be more disappointed by the things you did not do than by the ones you did do.",
    author: "Mark Twain",
    category: "motivation",
    difficulty: "medium",
  },
  {
    id: 9,
    text: "The best time to plant a tree was twenty years ago. The second best time is now.",
    author: "Chinese Proverb",
    category: "motivation",
    difficulty: "medium",
  },
  {
    id: 10,
    text: "Whether you think you can or you think you can't, you are right.",
    author: "Henry Ford",
    category: "motivation",
    difficulty: "medium",
  },
  {
    id: 11,
    text: "Do what you can, with what you have, where you are.",
    author: "Theodore Roosevelt",
    category: "motivation",
    difficulty: "short",
  },
  {
    id: 12,
    text: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
    category: "motivation",
    difficulty: "medium",
  },
  {
    id: 13,
    text: "It always seems impossible until it is done.",
    author: "Nelson Mandela",
    category: "motivation",
    difficulty: "short",
  },
  {
    id: 14,
    text: "Keep your eyes on the stars, and your feet on the ground. The strenuous life is the only life worth living, for the idle man knows neither true joys nor real sorrows.",
    author: "Theodore Roosevelt",
    category: "motivation",
    difficulty: "long",
  },

  // ── LITERATURE (ids 15-28) ────────────────────────────────────────────────

  {
    id: 15,
    text: "It was the best of times, it was the worst of times.",
    author: "Charles Dickens, A Tale of Two Cities",
    category: "literature",
    difficulty: "short",
  },
  {
    id: 16,
    text: "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do.",
    author: "Lewis Carroll, Alice's Adventures in Wonderland",
    category: "literature",
    difficulty: "medium",
  },
  {
    id: 17,
    text: "Call me Ishmael.",
    author: "Herman Melville, Moby-Dick",
    category: "literature",
    difficulty: "short",
  },
  {
    id: 18,
    text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
    author: "Jane Austen, Pride and Prejudice",
    category: "literature",
    difficulty: "medium",
  },
  {
    id: 19,
    text: "All animals are equal, but some animals are more equal than others.",
    author: "George Orwell, Animal Farm",
    category: "literature",
    difficulty: "medium",
  },
  {
    id: 20,
    text: "To be, or not to be, that is the question.",
    author: "William Shakespeare, Hamlet",
    category: "literature",
    difficulty: "short",
  },
  {
    id: 21,
    text: "All that glitters is not gold.",
    author: "William Shakespeare, The Merchant of Venice",
    category: "literature",
    difficulty: "short",
  },
  {
    id: 22,
    text: "There is nothing either good or bad, but thinking makes it so.",
    author: "William Shakespeare, Hamlet",
    category: "literature",
    difficulty: "medium",
  },
  {
    id: 23,
    text: "In the beginning God created the heavens and the earth. Now the earth was formless and empty, darkness was over the surface of the deep.",
    author: "Genesis 1:1-2, King James Bible",
    category: "literature",
    difficulty: "medium",
  },
  {
    id: 24,
    text: "Happy families are all alike; every unhappy family is unhappy in its own way.",
    author: "Leo Tolstoy, Anna Karenina",
    category: "literature",
    difficulty: "medium",
  },
  {
    id: 25,
    text: "Not all those who wander are lost.",
    author: "J.R.R. Tolkien, The Fellowship of the Ring",
    category: "literature",
    difficulty: "short",
  },
  {
    id: 26,
    text: "So we beat on, boats against the current, borne back ceaselessly into the past.",
    author: "F. Scott Fitzgerald, The Great Gatsby",
    category: "literature",
    difficulty: "medium",
  },
  {
    id: 27,
    text: "It was a bright cold day in April, and the clocks were striking thirteen. Winston Smith, his chin nuzzled into his breast in an effort to escape the vile wind, slipped quickly through the glass doors of Victory Mansions.",
    author: "George Orwell, Nineteen Eighty-Four",
    category: "literature",
    difficulty: "long",
  },
  {
    id: 28,
    text: "The only way out of the labyrinth of suffering is to forgive.",
    author: "John Green, Looking for Alaska",
    category: "literature",
    difficulty: "short",
  },

  // ── PROGRAMMING (ids 29-42) ───────────────────────────────────────────────

  {
    id: 29,
    text: "Programs must be written for people to read, and only incidentally for machines to execute.",
    author: "Harold Abelson, Structure and Interpretation of Computer Programs",
    category: "programming",
    difficulty: "medium",
  },
  {
    id: 30,
    text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
    author: "Martin Fowler",
    category: "programming",
    difficulty: "medium",
  },
  {
    id: 31,
    text: "Talk is cheap. Show me the code.",
    author: "Linus Torvalds",
    category: "programming",
    difficulty: "short",
  },
  {
    id: 32,
    text: "First, solve the problem. Then, write the code.",
    author: "John Johnson",
    category: "programming",
    difficulty: "short",
  },
  {
    id: 33,
    text: "Simplicity is the soul of efficiency.",
    author: "Austin Freeman",
    category: "programming",
    difficulty: "short",
  },
  {
    id: 34,
    text: "The most dangerous phrase in the language is: we have always done it this way.",
    author: "Grace Hopper",
    category: "programming",
    difficulty: "medium",
  },
  {
    id: 35,
    text: "Debugging is twice as hard as writing the code in the first place. Therefore, if you write the code as cleverly as possible, you are, by definition, not smart enough to debug it.",
    author: "Brian W. Kernighan",
    category: "programming",
    difficulty: "long",
  },
  {
    id: 36,
    text: "There are two ways of constructing a software design: one way is to make it so simple that there are obviously no deficiencies, and the other way is to make it so complicated that there are no obvious deficiencies.",
    author: "C.A.R. Hoare",
    category: "programming",
    difficulty: "long",
  },
  {
    id: 37,
    text: "Premature optimization is the root of all evil.",
    author: "Donald Knuth",
    category: "programming",
    difficulty: "short",
  },
  {
    id: 38,
    text: "The computer was born to solve problems that did not exist before.",
    author: "Bill Gates",
    category: "programming",
    difficulty: "short",
  },
  {
    id: 39,
    text: "Testing leads to failure, and failure leads to understanding.",
    author: "Burt Rutan",
    category: "programming",
    difficulty: "short",
  },
  {
    id: 40,
    text: "The function of good software is to make the complex appear to be simple.",
    author: "Grady Booch",
    category: "programming",
    difficulty: "medium",
  },
  {
    id: 41,
    text: "A language that doesn't affect the way you think about programming is not worth knowing.",
    author: "Alan Perlis",
    category: "programming",
    difficulty: "medium",
  },
  {
    id: 42,
    text: "It is not enough to do your best; you must know what to do, and then do your best.",
    author: "W. Edwards Deming",
    category: "programming",
    difficulty: "medium",
  },

  // ── SCIENCE (ids 43-56) ───────────────────────────────────────────────────

  {
    id: 43,
    text: "Imagination is more important than knowledge.",
    author: "Albert Einstein",
    category: "science",
    difficulty: "short",
  },
  {
    id: 44,
    text: "If I have seen further it is by standing on the shoulders of giants.",
    author: "Isaac Newton",
    category: "science",
    difficulty: "medium",
  },
  {
    id: 45,
    text: "The good thing about science is that it's true whether or not you believe in it.",
    author: "Neil deGrasse Tyson",
    category: "science",
    difficulty: "medium",
  },
  {
    id: 46,
    text: "In science there are no shortcuts to truth.",
    author: "Karl Popper",
    category: "science",
    difficulty: "short",
  },
  {
    id: 47,
    text: "Nothing in life is to be feared; it is only to be understood.",
    author: "Marie Curie",
    category: "science",
    difficulty: "short",
  },
  {
    id: 48,
    text: "Science is not only a disciple of reason but also one of romance and passion.",
    author: "Stephen Hawking",
    category: "science",
    difficulty: "medium",
  },
  {
    id: 49,
    text: "The important thing is not to stop questioning. Curiosity has its own reason for existence.",
    author: "Albert Einstein",
    category: "science",
    difficulty: "medium",
  },
  {
    id: 50,
    text: "Physics is not a religion. If it were, we'd have a much easier time raising money.",
    author: "Leon Lederman",
    category: "science",
    difficulty: "medium",
  },
  {
    id: 51,
    text: "I think nature's imagination is so much greater than man's, she's never gonna let us relax.",
    author: "Richard Feynman",
    category: "science",
    difficulty: "medium",
  },
  {
    id: 52,
    text: "The universe is under no obligation to make sense to you.",
    author: "Neil deGrasse Tyson",
    category: "science",
    difficulty: "short",
  },
  {
    id: 53,
    text: "An experiment is a question which science poses to Nature, and a measurement is the recording of Nature's answer.",
    author: "Max Planck",
    category: "science",
    difficulty: "medium",
  },
  {
    id: 54,
    text: "Equipped with his five senses, man explores the universe around him and calls the adventure Science.",
    author: "Edwin Hubble",
    category: "science",
    difficulty: "medium",
  },
  {
    id: 55,
    text: "Not only is the universe stranger than we think, it is stranger than we can think.",
    author: "Werner Heisenberg",
    category: "science",
    difficulty: "medium",
  },
  {
    id: 56,
    text: "Science is the great antidote to the poison of enthusiasm and superstition. It enlarges the mind and enriches the imagination by displaying the beauty and order that pervade the universe.",
    author: "Adam Smith",
    category: "science",
    difficulty: "long",
  },

  // ── PHILOSOPHY (ids 57-70) ────────────────────────────────────────────────

  {
    id: 57,
    text: "The unexamined life is not worth living.",
    author: "Socrates",
    category: "philosophy",
    difficulty: "short",
  },
  {
    id: 58,
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Aristotle",
    category: "philosophy",
    difficulty: "medium",
  },
  {
    id: 59,
    text: "I think, therefore I am.",
    author: "Rene Descartes",
    category: "philosophy",
    difficulty: "short",
  },
  {
    id: 60,
    text: "He who thinks great thoughts often makes great errors.",
    author: "Martin Heidegger",
    category: "philosophy",
    difficulty: "short",
  },
  {
    id: 61,
    text: "The only true wisdom is in knowing you know nothing.",
    author: "Socrates",
    category: "philosophy",
    difficulty: "short",
  },
  {
    id: 62,
    text: "Happiness is not something ready-made. It comes from your own actions.",
    author: "Dalai Lama",
    category: "philosophy",
    difficulty: "medium",
  },
  {
    id: 63,
    text: "Man is condemned to be free; because once thrown into the world, he is responsible for everything he does.",
    author: "Jean-Paul Sartre",
    category: "philosophy",
    difficulty: "medium",
  },
  {
    id: 64,
    text: "The life of man is solitary, poor, nasty, brutish, and short.",
    author: "Thomas Hobbes, Leviathan",
    category: "philosophy",
    difficulty: "medium",
  },
  {
    id: 65,
    text: "To do as one wishes, and to live with no regrets, that is the noblest aim of all.",
    author: "Immanuel Kant (paraphrase)",
    category: "philosophy",
    difficulty: "medium",
  },
  {
    id: 66,
    text: "One cannot step twice in the same river.",
    author: "Heraclitus",
    category: "philosophy",
    difficulty: "short",
  },
  {
    id: 67,
    text: "No man's knowledge here can go beyond his experience.",
    author: "John Locke",
    category: "philosophy",
    difficulty: "short",
  },
  {
    id: 68,
    text: "The mind is furnished with ideas by experience alone.",
    author: "John Locke",
    category: "philosophy",
    difficulty: "short",
  },
  {
    id: 69,
    text: "God is dead. God remains dead. And we have killed him. How shall we comfort ourselves, the murderers of all murderers?",
    author: "Friedrich Nietzsche, The Gay Science",
    category: "philosophy",
    difficulty: "medium",
  },
  {
    id: 70,
    text: "The greatest wealth is to live content with little, for there is never want where the mind is satisfied. Seek wisdom; it is the only path to true and lasting happiness.",
    author: "Lucretius",
    category: "philosophy",
    difficulty: "long",
  },

  // ── EXPANDED CLASSIC PASSAGES (ids 71-95) ─────────────────────────────────

  {
    id: 71,
    text: "Beware; for I am fearless, and therefore powerful.",
    author: "Mary Shelley",
    source: "Frankenstein (1818)",
    category: "literature",
    difficulty: "short",
  },
  {
    id: 72,
    text: "Hope is the thing with feathers that perches in the soul, and sings the tune without the words, and never stops at all.",
    author: "Emily Dickinson",
    source: "Poem 254",
    category: "literature",
    difficulty: "medium",
  },
  {
    id: 73,
    text: "Once upon a midnight dreary, while I pondered, weak and weary, over many a quaint and curious volume of forgotten lore.",
    author: "Edgar Allan Poe",
    source: "The Raven (1845)",
    category: "literature",
    difficulty: "medium",
  },
  {
    id: 74,
    text: "When you have eliminated the impossible, whatever remains, however improbable, must be the truth.",
    author: "Arthur Conan Doyle",
    source: "The Sign of the Four (1890)",
    category: "literature",
    difficulty: "medium",
  },
  {
    id: 75,
    text: "It is only with the heart that one can see rightly; what is essential is invisible to the eye.",
    author: "Antoine de Saint-Exupéry",
    source: "The Little Prince (1943)",
    category: "literature",
    difficulty: "medium",
  },
  {
    id: 76,
    text: "Two roads diverged in a wood, and I—I took the one less traveled by, and that has made all the difference.",
    author: "Robert Frost",
    source: "The Road Not Taken (1916)",
    category: "literature",
    difficulty: "medium",
  },
  {
    id: 77,
    text: "Be yourself; everyone else is already taken.",
    author: "Oscar Wilde",
    source: "Epigrams",
    category: "literature",
    difficulty: "short",
  },
  {
    id: 78,
    text: "There is no greater agony than bearing an untold story inside you.",
    author: "Maya Angelou",
    source: "I Know Why the Caged Bird Sings (1969)",
    category: "literature",
    difficulty: "short",
  },
  {
    id: 79,
    text: "Shall I compare thee to a summer's day? Thou art more lovely and more temperate. Rough winds do shake the darling buds of May, and summer's lease hath all too short a date.",
    author: "William Shakespeare",
    source: "Sonnet 18",
    category: "literature",
    difficulty: "medium",
  },
  {
    id: 80,
    text: "You have power over your mind - not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius",
    source: "Meditations, Book IV",
    category: "philosophy",
    difficulty: "medium",
  },
  {
    id: 81,
    text: "When you arise in the morning think of what a privilege it is to be alive, to think, to enjoy, to love.",
    author: "Marcus Aurelius",
    source: "Meditations",
    category: "philosophy",
    difficulty: "medium",
  },
  {
    id: 82,
    text: "We suffer more often in imagination than in reality.",
    author: "Seneca",
    source: "Letters from a Stoic",
    category: "philosophy",
    difficulty: "short",
  },
  {
    id: 83,
    text: "It is not what happens to you, but how you react to it that matters.",
    author: "Epictetus",
    source: "Enchiridion",
    category: "philosophy",
    difficulty: "short",
  },
  {
    id: 84,
    text: "A journey of a thousand miles begins with a single step.",
    author: "Lao Tzu",
    source: "Tao Te Ching, Chapter 64",
    category: "philosophy",
    difficulty: "short",
  },
  {
    id: 85,
    text: "In the midst of chaos, there is also opportunity.",
    author: "Sun Tzu",
    source: "The Art of War",
    category: "philosophy",
    difficulty: "short",
  },
  {
    id: 86,
    text: "Look again at that dot. That's here. That's home. That's us. On it everyone you love, everyone you know, everyone you ever heard of, every human being who ever was, lived out their lives.",
    author: "Carl Sagan",
    source: "Pale Blue Dot (1994)",
    category: "science",
    difficulty: "medium",
  },
  {
    id: 87,
    text: "The Analytical Engine weaves algebraical patterns just as the Jacquard-loom weaves flowers and leaves.",
    author: "Ada Lovelace",
    source: "Notes on the Analytical Engine (1843)",
    category: "science",
    difficulty: "medium",
  },
  {
    id: 88,
    text: "I would rather have questions that can't be answered than answers that can't be questioned.",
    author: "Richard Feynman",
    source: "The Pleasure of Finding Things Out",
    category: "science",
    difficulty: "medium",
  },
  {
    id: 89,
    text: "That's one small step for man, one giant leap for mankind.",
    author: "Neil Armstrong",
    source: "Apollo 11 Moon Landing (1969)",
    category: "science",
    difficulty: "short",
  },
  {
    id: 90,
    text: "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    author: "Alan Turing",
    source: "Computing Machinery and Intelligence (1950)",
    category: "programming",
    difficulty: "medium",
  },
  {
    id: 91,
    text: "Simplicity is prerequisite for reliability.",
    author: "Edsger W. Dijkstra",
    source: "Selected Writings on Computing",
    category: "programming",
    difficulty: "short",
  },
  {
    id: 92,
    text: "Adding manpower to a late software project makes it later.",
    author: "Fred Brooks",
    source: "The Mythical Man-Month (1975)",
    category: "programming",
    difficulty: "short",
  },
  {
    id: 93,
    text: "The Web as I envisaged it, we have not seen it yet. The future is still so much bigger than the past.",
    author: "Tim Berners-Lee",
    source: "Longitude Prize (2014)",
    category: "programming",
    difficulty: "medium",
  },
  {
    id: 94,
    text: "It is not the critic who counts; not the man who points out how the strong man stumbles. The credit belongs to the man who is actually in the arena, whose face is marred by dust and sweat and blood.",
    author: "Theodore Roosevelt",
    source: "Citizenship in a Republic (1910)",
    category: "motivation",
    difficulty: "long",
  },
  {
    id: 95,
    text: "Do not go where the path may lead, go instead where there is no path and leave a trail.",
    author: "Ralph Waldo Emerson",
    source: "Essays and Lectures",
    category: "motivation",
    difficulty: "medium",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-LANGUAGE WORD LISTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} LanguageData
 * @property {string}   name       - Display name in English
 * @property {string}   nativeName - Name in the native language
 * @property {string[]} words      - 200 most common words
 * @property {string[]} sentences  - 20 short practice sentences
 */

/** @type {Object.<string, LanguageData>} */
export const MULTI_LANG_WORDS = {

  // ── ENGLISH ───────────────────────────────────────────────────────────────
  en: {
    name: "English",
    nativeName: "English",
    words: [
      "the", "be", "to", "of", "and", "a", "in", "that", "have", "it",
      "for", "not", "on", "with", "he", "as", "you", "do", "at", "this",
      "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
      "an", "will", "my", "one", "all", "would", "there", "their", "what",
      "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
      "when", "make", "can", "like", "time", "no", "just", "him", "know",
      "take", "people", "into", "year", "your", "good", "some", "could",
      "them", "see", "other", "than", "then", "now", "look", "only", "come",
      "its", "over", "think", "also", "back", "after", "use", "two", "how",
      "our", "work", "first", "well", "way", "even", "new", "want", "because",
      "any", "these", "give", "day", "most", "us", "great", "between",
      "need", "large", "often", "hand", "high", "place", "hold", "point",
      "world", "play", "small", "number", "off", "always", "move", "live",
      "where", "much", "through", "long", "down", "every", "before", "never",
      "run", "old", "set", "turn", "try", "call", "tell", "ask", "leave",
      "show", "keep", "let", "read", "seem", "stop", "open", "face", "real",
      "feel", "right", "next", "hard", "few", "public", "head", "home",
      "air", "water", "light", "city", "road", "while", "both", "last",
      "might", "school", "own", "name", "found", "still", "learn", "plant",
      "cover", "food", "sun", "four", "thought", "tree", "cross", "farm",
      "start", "story", "saw", "far", "sea", "draw", "left", "late",
      "press", "close", "night", "north", "white", "children", "begin",
      "got", "walk", "example", "ease", "paper", "group", "music", "those",
      "mark", "book", "letter", "until", "mile", "river", "car", "feet",
      "care", "second", "enough", "plain", "girl", "usual", "young", "ready",
      "above", "ever", "red", "list", "though", "talk", "bird", "soon",
      "body", "dog", "family", "direct", "song", "measure", "door",
      "product", "black", "short", "class", "wind", "question", "happen",
      "complete", "ship", "area", "half", "rock", "order", "fire", "south",
    ],
    sentences: [
      "The quick brown fox jumps over the lazy dog.",
      "She sells seashells by the seashore.",
      "How much wood would a woodchuck chuck?",
      "The sun sets in the west every evening.",
      "Learning to type fast takes daily practice.",
      "A good book is the best of friends.",
      "Time and tide wait for no man.",
      "Actions speak louder than words.",
      "Every great journey begins with a single step.",
      "The early bird catches the worm.",
      "Knowledge is power and power is freedom.",
      "Practice makes perfect in all things.",
      "The pen is mightier than the sword.",
      "All that glitters is not gold.",
      "Look before you leap into any situation.",
      "Where there is a will there is a way.",
      "An apple a day keeps the doctor away.",
      "Two heads are better than one always.",
      "Better late than never to start learning.",
      "The more you read the more you know.",
    ],
  },

  // ── SPANISH ───────────────────────────────────────────────────────────────
  es: {
    name: "Spanish",
    nativeName: "Español",
    words: [
      "el", "la", "de", "que", "y", "a", "en", "un", "ser", "se",
      "no", "haber", "por", "con", "su", "para", "como", "estar", "tener",
      "le", "lo", "todo", "pero", "mas", "hacer", "o", "poder", "decir",
      "este", "ir", "otro", "ese", "si", "me", "ya", "ver", "porque",
      "dar", "cuando", "muy", "sin", "vez", "mucho", "saber", "sobre",
      "mi", "alguno", "mismo", "yo", "tambien", "hasta", "donde", "quien",
      "desde", "durante", "uno", "ni", "contra", "grande", "poco", "tiempo",
      "vida", "año", "dia", "hombre", "lugar", "mano", "forma", "parte",
      "mundo", "mujer", "momento", "caso", "trabajo", "cosa", "manera",
      "siempre", "nuestro", "gente", "nuevo", "tanto", "pais", "ciudad",
      "grupo", "problema", "gobierno", "tipo", "empresa", "agua", "lado",
      "programa", "sistema", "punto", "social", "nombre", "segundo",
      "orden", "numero", "nivel", "proceso", "poner", "volver", "parecer",
      "quedar", "creer", "hablar", "llevar", "dejar", "seguir", "encontrar",
      "llamar", "venir", "pensar", "salir", "llegar", "pasar", "conocer",
      "vivir", "sentir", "tratar", "mirar", "contar", "empezar", "esperar",
      "buscar", "existir", "entrar", "trabajar", "escribir", "perder",
      "producir", "ocurrir", "entender", "pedir", "recibir", "recordar",
      "terminar", "permitir", "aparecer", "conseguir", "comenzar", "servir",
      "sacar", "necesitar", "mantener", "resultar", "leer", "caer",
      "cambiar", "presentar", "crear", "abrir", "considerar", "ofrecer",
      "descubrir", "establecer", "lograr", "indicar", "comunicar", "mostrar",
      "construir", "aplicar", "mejorar", "aumentar", "reducir", "iniciar",
      "desarrollar", "generar", "alcanzar", "incluir", "realizar", "utilizar",
      "obtener", "convertir", "decidir", "analizar", "definir", "evaluar",
      "identificar", "proporcionar", "determinar", "blanco", "negro", "rojo",
      "azul", "verde", "grande", "pequeño", "bueno", "malo", "feliz",
      "triste", "rapido", "lento", "fuerte", "debil", "joven", "viejo",
      "nuevo", "antiguo", "alto", "bajo", "largo", "corto", "claro",
      "oscuro", "caliente", "frio", "rico", "pobre", "libre", "seguro",
      "facil", "dificil", "posible", "necesario", "primer", "ultimo",
    ],
    sentences: [
      "El sol sale por el este cada manana.",
      "Me gusta aprender idiomas nuevos cada dia.",
      "La vida es bella cuando tienes amigos.",
      "El trabajo duro siempre da buenos resultados.",
      "Los libros son los mejores amigos del hombre.",
      "El tiempo es oro y hay que aprovecharlo.",
      "La familia es lo mas importante en la vida.",
      "Cada dia es una nueva oportunidad para crecer.",
      "El amor y la amistad son muy importantes.",
      "La musica es el lenguaje universal del alma.",
      "Un buen libro puede cambiar tu perspectiva.",
      "La educacion es la llave del exito futuro.",
      "El mar es profundo y lleno de misterios.",
      "La naturaleza nos da todo lo que necesitamos.",
      "El conocimiento es poder en el mundo moderno.",
      "Cada persona tiene su propia historia de vida.",
      "La salud es el bien mas grande del ser.",
      "El respeto mutuo es base de toda amistad.",
      "Los suenos son el motor de la vida humana.",
      "La honestidad es la mejor politica en todo.",
    ],
  },

  // ── FRENCH ────────────────────────────────────────────────────────────────
  fr: {
    name: "French",
    nativeName: "Français",
    words: [
      "le", "de", "un", "et", "à", "il", "avoir", "ne", "je", "son",
      "que", "se", "qui", "ce", "dans", "en", "du", "elle", "au", "tout",
      "y", "mais", "bien", "ou", "si", "leur", "pouvoir", "faire", "même",
      "par", "savoir", "plus", "pas", "nous", "comme", "vouloir", "on",
      "avec", "aussi", "mettre", "lui", "temps", "dire", "voir", "aller",
      "venir", "prendre", "encore", "donner", "très", "homme", "femme",
      "jour", "vie", "an", "pays", "chose", "main", "monde", "enfant",
      "grand", "petit", "nouveau", "premier", "nuit", "place", "long",
      "soir", "eau", "fois", "ville", "sans", "moment", "toujours", "entre",
      "peu", "sous", "pendant", "depuis", "après", "avant", "contre",
      "chez", "non", "moi", "toi", "mon", "ma", "mes", "ton", "ta",
      "tes", "notre", "votre", "leurs", "celui", "celle", "ceux", "celles",
      "quand", "car", "donc", "or", "ni", "hier", "demain", "maintenant",
      "souvent", "jamais", "ici", "là", "partout", "rouge", "bleu", "vert",
      "blanc", "noir", "jaune", "orange", "bon", "mauvais", "haut", "bas",
      "fort", "faible", "jeune", "vieux", "beau", "laid", "chaud", "froid",
      "lourd", "vite", "lentement", "mal", "trop", "assez", "beaucoup",
      "moins", "rien", "personne", "autre", "tel", "chaque", "plusieurs",
      "aucun", "certain", "trouver", "suivre", "vivre", "croire", "penser",
      "rester", "parler", "partir", "tenir", "sembler", "demander",
      "montrer", "laisser", "comprendre", "entendre", "répondre", "perdre",
      "ouvrir", "devenir", "sortir", "attendre", "sentir", "passer",
      "changer", "garder", "arriver", "entrer", "tomber", "porter", "aimer",
      "jouer", "travailler", "vivre", "savoir", "pouvoir", "devoir",
      "vouloir", "aller", "avoir", "être", "faire", "dire", "voir",
      "prendre", "venir", "mettre", "devoir", "partir", "tenir", "rendre",
      "revenir", "permettre", "lire", "écrire", "naître", "mourir",
    ],
    sentences: [
      "Le soleil se lève à l'est chaque matin.",
      "J'aime lire des livres dans le parc.",
      "La vie est belle quand on a des amis.",
      "Le travail bien fait apporte de la fierté.",
      "Chaque jour est une nouvelle chance de réussir.",
      "La musique adoucit les moeurs et le coeur.",
      "L'amour et l'amitié sont très précieux.",
      "Un bon repas réunit toute la famille.",
      "Les enfants jouent dans le jardin le soir.",
      "La nature est magnifique et pleine de vie.",
      "Apprendre une langue ouvre de nouvelles portes.",
      "Le temps passe vite quand on est heureux.",
      "La santé est notre bien le plus précieux.",
      "Chaque personne a sa propre histoire unique.",
      "La connaissance est la clé du succès.",
      "Les étoiles brillent dans le ciel nocturne.",
      "Le bonheur se trouve dans les petites choses.",
      "La mer est belle sous le soleil d'été.",
      "Un sourire peut changer toute une journée.",
      "La patience est une grande vertu humaine.",
    ],
  },

  // ── GERMAN ────────────────────────────────────────────────────────────────
  de: {
    name: "German",
    nativeName: "Deutsch",
    words: [
      "der", "die", "und", "in", "den", "von", "zu", "das", "mit", "sich",
      "des", "auf", "für", "ist", "im", "dem", "nicht", "ein", "eine",
      "als", "auch", "es", "an", "werden", "aus", "er", "hat", "dass",
      "sie", "nach", "wird", "bei", "einer", "um", "am", "sind", "noch",
      "wie", "einem", "über", "einen", "so", "zum", "war", "haben", "nur",
      "oder", "aber", "vor", "zur", "bis", "mehr", "durch", "man", "sein",
      "wurde", "sei", "sondern", "kann", "da", "dieser", "wenn", "was",
      "wir", "ihn", "ob", "doch", "mir", "diesem", "hatte", "dann", "ihr",
      "unter", "zwischen", "zwei", "Jahr", "Leben", "Zeit", "Welt",
      "Mensch", "Tag", "Hand", "Frau", "Kind", "Mann", "Haus", "Land",
      "Teil", "Wort", "Wasser", "Stadt", "Weg", "Nacht", "Auge", "Volk",
      "Arbeit", "Buch", "Kopf", "Zahl", "Herz", "Schule", "Recht", "Seite",
      "Erde", "Licht", "Ende", "Stimme", "Frage", "Bereich", "Gruppe",
      "Problem", "Punkt", "Raum", "Name", "Blick", "Gesicht", "Kraft",
      "Platz", "System", "klein", "gross", "gut", "schlecht", "alt", "neu",
      "jung", "lang", "kurz", "hoch", "tief", "schnell", "langsam", "stark",
      "schwach", "früh", "spät", "viel", "wenig", "immer", "nie", "oft",
      "selten", "schon", "bereits", "hier", "dort", "oben", "unten",
      "links", "rechts", "heute", "morgen", "gestern", "jetzt", "dann",
      "wann", "warum", "wer", "wo", "wohin", "woher", "welche", "jener",
      "gehen", "kommen", "sehen", "wissen", "wollen", "denken", "geben",
      "nehmen", "bleiben", "stehen", "laufen", "schreiben", "lesen",
      "hören", "sprechen", "fragen", "antworten", "lernen", "machen",
      "spielen", "arbeiten", "helfen", "warten", "suchen", "finden",
      "lieben", "glauben", "kennen", "mögen", "müssen", "sollen", "dürfen",
      "können", "brauchen", "heissen", "bedeuten", "zeigen", "halten",
      "führen", "bringen", "stellen", "legen", "setzen", "bauen", "leben",
    ],
    sentences: [
      "Die Sonne geht jeden Morgen im Osten auf.",
      "Ich lerne jeden Tag etwas Neues dazu.",
      "Das Leben ist schön mit guten Freunden.",
      "Harte Arbeit führt immer zum Erfolg.",
      "Bücher sind die besten Freunde des Menschen.",
      "Zeit ist Geld und sehr wertvoll.",
      "Die Familie ist das Wichtigste im Leben.",
      "Jeder Tag ist eine neue Möglichkeit zu wachsen.",
      "Musik verbindet Menschen auf der ganzen Welt.",
      "Die Natur ist wunderschön und voller Leben.",
      "Bildung ist der Schlüssel zum Erfolg.",
      "Wasser ist das wichtigste Element des Lebens.",
      "Ein gutes Buch kann dein Leben verändern.",
      "Die Freundschaft ist ein großes Geschenk.",
      "Geduld ist eine Tugend die sich lohnt.",
      "Der Himmel ist heute sehr blau und klar.",
      "Das Meer ist tief und voller Geheimnisse.",
      "Jeder Mensch hat seine eigene Geschichte.",
      "Lachen ist die beste Medizin für alles.",
      "Wissen ist Macht und öffnet viele Türen.",
    ],
  },

  // ── ITALIAN ───────────────────────────────────────────────────────────────
  it: {
    name: "Italian",
    nativeName: "Italiano",
    words: [
      "di", "e", "il", "in", "la", "a", "che", "un", "per", "con",
      "del", "una", "i", "le", "si", "non", "lo", "dalla", "alla", "ma",
      "ha", "ho", "mi", "da", "gli", "se", "suo", "al", "ci", "più",
      "sono", "come", "anche", "sua", "dei", "ne", "dove", "questa",
      "essere", "fare", "andare", "vedere", "sapere", "volere", "dovere",
      "potere", "stare", "avere", "dire", "venire", "dare", "uscire",
      "partire", "tornare", "trovare", "lasciare", "prendere", "tenere",
      "vita", "anno", "uomo", "giorno", "mondo", "tempo", "donna", "mano",
      "città", "parte", "paese", "casa", "bene", "modo", "numero",
      "punto", "cosa", "libro", "lavoro", "acqua", "luce", "notte",
      "cuore", "voce", "testa", "occhio", "bocca", "piede", "braccio",
      "amico", "famiglia", "bambino", "ragazzo", "ragazza", "signore",
      "buono", "cattivo", "grande", "piccolo", "nuovo", "vecchio",
      "bello", "brutto", "alto", "basso", "lungo", "corto", "caldo",
      "freddo", "forte", "debole", "veloce", "lento", "felice", "triste",
      "facile", "difficile", "libero", "ricco", "povero", "giovane",
      "bianco", "nero", "rosso", "blu", "verde", "giallo", "arancione",
      "molto", "poco", "troppo", "abbastanza", "sempre", "mai", "spesso",
      "raramente", "ancora", "già", "subito", "poi", "allora", "quindi",
      "qui", "là", "sopra", "sotto", "dentro", "fuori", "avanti", "dietro",
      "destra", "sinistra", "oggi", "ieri", "domani", "adesso", "quando",
      "dove", "chi", "quanto", "quale", "ogni", "tutto", "niente",
      "qualcosa", "qualcuno", "nessuno", "altro", "stesso", "primo",
      "ultimo", "solo", "insieme", "contro", "senza", "dopo", "prima",
      "durante", "attraverso", "verso", "tra", "fra", "oltre", "mio",
      "tuo", "suo", "nostro", "vostro", "loro", "questo", "quello",
      "parlare", "leggere", "scrivere", "correre", "mangiare", "bere",
      "dormire", "lavorare", "studiare", "giocare", "cantare", "ballare",
    ],
    sentences: [
      "Il sole sorge a est ogni mattina.",
      "Mi piace leggere libri nel parco.",
      "La vita è bella con i buoni amici.",
      "Il lavoro duro porta sempre buoni risultati.",
      "Ogni giorno è una nuova opportunità di crescere.",
      "La musica è il linguaggio universale dell'anima.",
      "L'amore e l'amicizia sono molto importanti.",
      "Un buon libro può cambiare la tua vita.",
      "La natura è meravigliosa e piena di vita.",
      "Imparare una lingua apre nuove porte nel mondo.",
      "Il tempo passa veloce quando si è felici.",
      "La salute è il bene più prezioso che abbiamo.",
      "Ogni persona ha la sua storia unica.",
      "La conoscenza è la chiave del successo futuro.",
      "Il mare è bello e misterioso sotto il sole.",
      "La famiglia è la cosa più importante nella vita.",
      "La pazienza è una grande virtù umana.",
      "Un sorriso può cambiare l'intera giornata.",
      "Le stelle brillano nel cielo notturno chiaro.",
      "La gentilezza costa niente ma vale tutto.",
    ],
  },

  // ── PORTUGUESE ────────────────────────────────────────────────────────────
  pt: {
    name: "Portuguese",
    nativeName: "Português",
    words: [
      "de", "a", "o", "que", "e", "do", "da", "em", "um", "para",
      "uma", "com", "os", "no", "se", "na", "por", "mais", "as", "dos",
      "como", "mas", "ao", "ele", "das", "seu", "sua", "ou", "quando",
      "muito", "nos", "já", "eu", "também", "só", "pelo", "pela",
      "até", "isso", "ela", "entre", "depois", "sem", "mesmo", "aos",
      "seus", "quem", "nas", "me", "esse", "eles", "você", "essa",
      "nem", "suas", "meu", "às", "minha", "numa", "pelos", "elas",
      "seja", "qual", "será", "nós", "tenho", "lhe", "deles", "essas",
      "esses", "pelas", "este", "fosse", "ser", "ter", "estar", "fazer",
      "ir", "ver", "dar", "saber", "querer", "poder", "vir", "ficar",
      "achar", "falar", "dizer", "deixar", "tomar", "pagar", "ouvir",
      "trazer", "ler", "criar", "seguir", "ajudar", "trabalhar", "viver",
      "encontrar", "voltar", "vida", "ano", "homem", "dia", "mundo",
      "tempo", "mulher", "mão", "cidade", "parte", "pais", "casa", "bem",
      "modo", "numero", "ponto", "coisa", "livro", "trabalho", "agua",
      "luz", "noite", "coracao", "voz", "cabeca", "olho", "boca", "pe",
      "braco", "amigo", "familia", "criança", "rapaz", "moca", "senhor",
      "bom", "mau", "grande", "pequeno", "novo", "velho", "bonito",
      "alto", "baixo", "longo", "curto", "quente", "frio", "forte",
      "fraco", "rapido", "lento", "feliz", "triste", "facil", "dificil",
      "livre", "rico", "pobre", "jovem", "branco", "preto", "vermelho",
      "azul", "verde", "amarelo", "muito", "pouco", "sempre", "nunca",
      "ainda", "ja", "logo", "aqui", "la", "acima", "abaixo", "dentro",
      "fora", "frente", "atras", "direita", "esquerda", "hoje", "ontem",
      "amanha", "agora", "porque", "onde", "quanto", "meu", "teu",
      "nosso", "vosso", "dele", "este", "esse", "aquele", "isso", "aquilo",
      "falar", "escrever", "correr", "comer", "beber", "dormir", "cantar",
    ],
    sentences: [
      "O sol nasce no leste todas as manhas.",
      "Eu gosto de ler livros no parque.",
      "A vida e bonita com bons amigos.",
      "O trabalho duro sempre traz bons resultados.",
      "Cada dia e uma nova oportunidade de crescer.",
      "A musica e a linguagem universal da alma.",
      "O amor e a amizade sao muito importantes.",
      "Um bom livro pode mudar a sua vida.",
      "A natureza e maravilhosa e cheia de vida.",
      "Aprender uma lingua abre novas portas no mundo.",
      "O tempo passa rapido quando estamos felizes.",
      "A saude e o bem mais precioso que temos.",
      "Cada pessoa tem a sua propria historia unica.",
      "O conhecimento e a chave para o sucesso.",
      "O mar e belo e misterioso sob o sol.",
      "A familia e a coisa mais importante na vida.",
      "A paciencia e uma grande virtude humana.",
      "Um sorriso pode mudar o dia inteiro.",
      "As estrelas brilham no ceu noturno claro.",
      "A gentileza nao custa nada mas vale tudo.",
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lightweight integer hash function (mulberry32).
 * Produces a deterministic pseudo-random float in [0, 1) from a seed.
 *
 * @param {number} seed
 * @returns {number} float in [0, 1)
 */
function seededRandom(seed) {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Returns a numeric seed derived from today's date (YYYYMMDD).
 * Changes once per calendar day in the user's local timezone.
 *
 * @returns {number}
 */
function todaySeed() {
  const now = new Date();
  return (
    now.getFullYear() * 10000 +
    (now.getMonth() + 1) * 100 +
    now.getDate()
  );
}

/**
 * Shuffle an array deterministically given a numeric seed.
 * Returns a new array — the original is not mutated.
 *
 * @template T
 * @param {T[]} arr
 * @param {number} seed
 * @returns {T[]}
 */
function shuffleSeeded(arr, seed) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a deterministic "Quote of the Day" that changes once per calendar day.
 * The selection cycles through the entire QUOTE_VAULT so every quote eventually
 * gets a day in the spotlight.
 *
 * @returns {Quote}
 */
export function getQuoteOfTheDay() {
  const seed = todaySeed();
  const shuffled = shuffleSeeded(QUOTE_VAULT, seed);
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - startOfYear) / 86400000);
  const index = dayOfYear % shuffled.length;
  return shuffled[index];
}

/**
 * Filter the quote vault by category and/or difficulty.
 * Passing `null` (or omitting) for either parameter skips that filter.
 *
 * @param {string|null} [category=null]   - 'motivation' | 'literature' | 'programming' | 'science' | 'philosophy'
 * @param {string|null} [difficulty=null] - 'short' | 'medium' | 'long'
 * @returns {Quote[]} Filtered array (may be empty)
 */
export function getQuotesByFilter(category = null, difficulty = null) {
  return QUOTE_VAULT.filter((q) => {
    const catMatch = !category || q.category === category;
    const diffMatch = !difficulty || q.difficulty === difficulty;
    return catMatch && diffMatch;
  });
}

/**
 * Advanced query and filter engine for Quote Vault.
 * Supports category, difficulty, search text, practice/bookmark status, and sorting.
 *
 * @param {Object} [options={}]
 * @param {string|null} [options.category=null] - Category filter
 * @param {string|null} [options.difficulty=null] - Difficulty/length filter
 * @param {string} [options.search=''] - Keyword search (case-insensitive)
 * @param {string} [options.status='all'] - 'all' | 'unpracticed' | 'practiced' | 'bookmarked'
 * @param {string} [options.sortBy='default'] - 'default' | 'shortest' | 'longest' | 'author' | 'wpm'
 * @param {number[]} [options.practicedIds=[]] - Array of practiced quote IDs
 * @param {number[]} [options.bookmarkedIds=[]] - Array of bookmarked quote IDs
 * @param {Object} [options.quoteStatsMap={}] - Map of { [id]: { bestWpm, count } }
 * @returns {Quote[]} Filtered and sorted quotes
 */
export function queryQuotes({
  category = null,
  difficulty = null,
  search = '',
  status = 'all',
  sortBy = 'default',
  practicedIds = [],
  bookmarkedIds = [],
  quoteStatsMap = {}
} = {}) {
  const term = typeof search === 'string' ? search.trim().toLowerCase() : '';

  let list = QUOTE_VAULT.filter((q) => {
    if (category && q.category !== category) return false;
    if (difficulty && q.difficulty !== difficulty) return false;

    if (status === 'practiced' && !practicedIds.includes(q.id)) return false;
    if (status === 'unpracticed' && practicedIds.includes(q.id)) return false;
    if (status === 'bookmarked' && !bookmarkedIds.includes(q.id)) return false;

    if (term) {
      const textMatch = q.text.toLowerCase().includes(term);
      const authorMatch = q.author.toLowerCase().includes(term);
      const sourceMatch = q.source ? q.source.toLowerCase().includes(term) : false;
      const catMatch = q.category.toLowerCase().includes(term);
      if (!textMatch && !authorMatch && !sourceMatch && !catMatch) return false;
    }

    return true;
  });

  if (sortBy === 'shortest') {
    list.sort((a, b) => a.text.length - b.text.length);
  } else if (sortBy === 'longest') {
    list.sort((a, b) => b.text.length - a.text.length);
  } else if (sortBy === 'author') {
    list.sort((a, b) => a.author.localeCompare(b.author));
  } else if (sortBy === 'wpm') {
    list.sort((a, b) => {
      const wpmA = quoteStatsMap[a.id]?.bestWpm || 0;
      const wpmB = quoteStatsMap[b.id]?.bestWpm || 0;
      if (wpmB !== wpmA) return wpmB - wpmA;
      return a.id - b.id;
    });
  }

  return list;
}

/**
 * Calculates estimated reading and typing duration in seconds for a text
 * based on standard target speed (default 40 WPM ~ 200 chars/min).
 *
 * @param {string} text
 * @param {number} [wpm=40]
 * @returns {number} duration in seconds
 */
export function estimateTypingTimeSec(text, wpm = 40) {
  if (!text) return 0;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.max(5, Math.round((wordCount / Math.max(10, wpm)) * 60));
}

/**
 * Pick a random quote from the QUOTE_VAULT.
 * Optionally filtered by category and/or difficulty.
 * Optionally excludes a specific quote ID to avoid consecutive duplicates.
 *
 * @param {string|null} [category=null]   - 'motivation' | 'literature' | 'programming' | 'science' | 'philosophy'
 * @param {string|null} [difficulty=null] - 'short' | 'medium' | 'long'
 * @param {number|null} [excludeId=null]  - ID of quote to exclude from selection if alternatives exist
 * @returns {Quote|null}
 */
export function getRandomQuote(category = null, difficulty = null, excludeId = null) {
  let pool = getQuotesByFilter(category, difficulty);
  if (pool.length === 0) {
    pool = QUOTE_VAULT;
  }
  if (excludeId !== null && pool.length > 1) {
    const withoutExcluded = pool.filter(q => q.id !== excludeId);
    if (withoutExcluded.length > 0) {
      pool = withoutExcluded;
    }
  }
  if (pool.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/**
 * Build a CustomPracticeManager-compatible lesson object for a given language.
 * Each of the three rounds contains a mix of random sentences and random words
 * from the target language, giving learners varied exposure to the script.
 *
 * @param {string} langCode - One of: 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt'
 * @returns {{
 *   id: string,
 *   title: string,
 *   rounds: string[],
 *   roundLabels: string[],
 *   wpmTarget: number,
 *   accuracyTarget: number,
 *   estimatedMinutes: number,
 *   keys: string[],
 *   isCustom: boolean
 * }|null} Lesson object, or null if langCode is unrecognised.
 */
export function generateLanguagePractice(langCode) {
  const lang = MULTI_LANG_WORDS[langCode];
  if (!lang) {
    console.warn(`[generateLanguagePractice] Unknown language code: "${langCode}"`);
    return null;
  }

  /**
   * Pick n random items from arr using a time-seeded shuffle.
   *
   * @param {string[]} arr
   * @param {number}   n
   * @returns {string[]}
   */
  function pick(arr, n) {
    const seed = Date.now() + Math.random() * 1e9;
    return shuffleSeeded(arr, seed).slice(0, n);
  }

  /**
   * Compose one round string: 3-5 sentences followed by a run of random words.
   *
   * @returns {string}
   */
  function buildRound() {
    const sentenceCount = 3 + Math.floor(Math.random() * 3); // 3-5
    const sentences = pick(lang.sentences, sentenceCount);
    const words = pick(lang.words, 20);
    return [...sentences, words.join(" ")].join(" ");
  }

  return {
    id: `lang-practice-${langCode}`,
    title: `${lang.name} Practice`,
    rounds: [buildRound(), buildRound(), buildRound()],
    roundLabels: ["Warm-up", "Main Practice", "Speed Round"],
    wpmTarget: 30,
    accuracyTarget: 90,
    estimatedMinutes: 5,
    keys: ["all"],
    isCustom: true,
  };
}
