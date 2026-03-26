/**
 * Seed script for the Creation Witness corpus.
 * Run: npx tsx scripts/seed-creation-witness.ts
 *
 * Sources: Hovind (seminars + college), AiG, ICR, CMI, Discovery Institute
 * Content curated from publicly available arguments by each source,
 * organized by the priority topic seed list in CREATION-WITNESS-SPEC.md.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface WitnessEntry {
  source: string
  title: string
  content: string
  topic_tags: string[]
  scripture_references: string[]
  science_domain: string
  argument_type: string
  source_url: string
  source_date: string
}

const entries: WitnessEntry[] = [
  // ═══════════════════════════════════════════════════
  // HOVIND — Seminar Series (1999 Edition)
  // ═══════════════════════════════════════════════════
  {
    source: 'hovind',
    title: 'Seminar 1 — Age of the Earth: The Human Eye',
    content: 'The human eye has over 130 million photoreceptor cells. It can distinguish 10 million colors and processes 1.5 million simultaneous signals. It self-focuses in milliseconds, adjusts to brightness ratios of 10 billion to one, and repairs itself while you sleep. Charles Darwin himself wrote: "To suppose that the eye could have been formed by natural selection seems, I freely confess, absurd in the highest possible degree." If the world\'s greatest engineers cannot replicate what a single human eye does, how can anyone claim it assembled itself by accident?',
    topic_tags: ['human_eye', 'irreducible_complexity', 'human_body'],
    scripture_references: ['Psalm 139:14', 'Proverbs 20:12'],
    science_domain: 'biology',
    argument_type: 'complexity',
    source_url: 'https://archive.org/details/creation-science-evangelism-seminar-1999-edition',
    source_date: '1999',
  },
  {
    source: 'hovind',
    title: 'Seminar 1 — Age of the Earth: DNA Information Content',
    content: 'A single strand of human DNA contains approximately 3.2 billion base pairs of information — enough data to fill 1,000 volumes of an encyclopedia. The information content of DNA is not chemistry — it is language. Chemistry can explain the ink on a page, but it cannot explain the sentences. Information always comes from intelligence. There is no known natural process that generates coded information. Every DNA molecule in your body is a message written by an Author who is not random chance.',
    topic_tags: ['dna_complexity', 'human_body', 'genesis_creation'],
    scripture_references: ['Psalm 139:14-16', 'Jeremiah 1:5'],
    science_domain: 'genetics',
    argument_type: 'design',
    source_url: 'https://archive.org/details/creation-science-evangelism-seminar-1999-edition',
    source_date: '1999',
  },
  {
    source: 'hovind',
    title: 'Seminar 2 — Garden of Eden: Dinosaurs and Man',
    content: 'The Bible describes creatures in Job 40 and 41 that match no living animal. Behemoth has a tail like a cedar tree — that is not a hippo or an elephant. Leviathan breathes fire and has scales so tight no air can pass between them. Ancient cultures across the world — Chinese, European, African, Native American — all have detailed dragon accounts. The word "dinosaur" was not invented until 1841 by Richard Owen. Before that, they were called dragons, and they appear in historical records from every continent.',
    topic_tags: ['dinosaurs_bible', 'behemoth_leviathan', 'dragons'],
    scripture_references: ['Job 40:15-24', 'Job 41:1-34', 'Isaiah 27:1'],
    science_domain: 'biology',
    argument_type: 'origins',
    source_url: 'https://archive.org/details/creation-science-evangelism-seminar-1999-edition',
    source_date: '1999',
  },
  {
    source: 'hovind',
    title: 'Seminar 3 — Dinosaurs and the Bible: Living Fossils',
    content: 'The coelacanth was declared extinct for 70 million years — until fishermen caught one alive in 1938 off the coast of South Africa. They have been found alive repeatedly since. The Wollemi Pine was said to be extinct for 150 million years — found growing in Australia in 1994. If these creatures survived unchanged for supposed millions of years, the entire dating framework is called into question. Living fossils are not anomalies — they are evidence that the millions-of-years timeline is wrong.',
    topic_tags: ['living_dinosaurs', 'evolution_fraud', 'age_of_earth'],
    scripture_references: ['Genesis 1:21', 'Genesis 1:25'],
    science_domain: 'biology',
    argument_type: 'refutation',
    source_url: 'https://archive.org/details/creation-science-evangelism-seminar-1999-edition',
    source_date: '1999',
  },
  {
    source: 'hovind',
    title: 'Seminar 4 — Lies in the Textbooks: Fraudulent Evidence',
    content: 'Ernst Haeckel\'s embryo drawings were used in biology textbooks for over a century to support evolution. Haeckel was convicted of fraud by his own university in 1874 — he fabricated the drawings to make embryos look similar. Piltdown Man was presented as a missing link for 40 years before being exposed as a deliberate hoax — a human skull paired with an orangutan jaw filed down and stained. Nebraska Man was reconstructed from a single tooth that turned out to belong to a pig. These are not minor errors — they are the pillars that held up the theory for generations.',
    topic_tags: ['evolution_fraud', 'textbook_errors', 'missing_links'],
    scripture_references: ['Romans 1:22', '2 Timothy 4:3-4'],
    science_domain: 'biology',
    argument_type: 'refutation',
    source_url: 'https://archive.org/details/creation-science-evangelism-seminar-1999-edition',
    source_date: '1999',
  },
  {
    source: 'hovind',
    title: 'Seminar 6 — The Hovind Theory: Global Flood Model',
    content: 'Before the Flood, the earth was surrounded by a canopy of water vapor and possibly ice that filtered harmful radiation and maintained uniform global temperature. When this canopy collapsed, it produced 40 days of rainfall while simultaneously the fountains of the great deep broke open. The resulting catastrophe explains sedimentary layers, fossil graveyards, coal deposits, oil reserves, mountain folding, and the Grand Canyon — all formed rapidly by water, not slowly over millions of years. Every major sedimentary formation on earth contains marine fossils, including mountaintops, because the entire earth was once covered with water.',
    topic_tags: ['noahs_flood', 'flood_geology', 'grand_canyon', 'hovind_theory'],
    scripture_references: ['Genesis 7:11-12', 'Genesis 7:19-20', '2 Peter 3:5-6'],
    science_domain: 'geology',
    argument_type: 'geology',
    source_url: 'https://archive.org/details/creation-science-evangelism-seminar-1999-edition',
    source_date: '1999',
  },
  {
    source: 'hovind',
    title: 'Seminar 1 — Age of the Earth: Moon Recession',
    content: 'The moon is moving away from the earth at approximately 1.5 inches per year. This rate was faster in the past due to tidal interaction. If you extrapolate backward even 1.4 billion years, the moon would have been touching the earth. The Roche Limit means any closer and tidal forces would destroy both bodies. This places an absolute upper limit on the age of the earth-moon system that is far less than the 4.5 billion years commonly claimed.',
    topic_tags: ['moon_recession', 'age_of_earth'],
    scripture_references: ['Genesis 1:16', 'Psalm 8:3'],
    science_domain: 'astronomy',
    argument_type: 'astronomy',
    source_url: 'https://archive.org/details/creation-science-evangelism-seminar-1999-edition',
    source_date: '1999',
  },

  // ═══════════════════════════════════════════════════
  // HOVIND COLLEGE — Structured Curriculum
  // ═══════════════════════════════════════════════════
  {
    source: 'hovind_college',
    title: 'CSE 101 — Blood Clotting Cascade',
    content: 'The blood clotting cascade requires over 20 interdependent protein factors activating in precise sequence. Remove any single factor and the system fails — the organism bleeds to death. Add any factor out of sequence and the organism clots internally and dies. This is irreducible complexity in its most lethal form. Evolution cannot produce this system gradually because any partial system kills the organism. The clotting cascade must have been designed complete and functional from the beginning.',
    topic_tags: ['blood_clotting', 'irreducible_complexity', 'human_body'],
    scripture_references: ['Leviticus 17:11', 'Psalm 139:14'],
    science_domain: 'biology',
    argument_type: 'complexity',
    source_url: 'https://www.creationism.org/videos/KentHovind/HovindCollegeCourses_Notebook.pdf',
    source_date: '2004',
  },
  {
    source: 'hovind_college',
    title: 'CSE 102 — Ice Age Model',
    content: 'The post-Flood ice age model explains the evidence better than evolutionary models. Warm oceans after the Flood (heated by volcanic activity from the fountains of the deep) produced massive evaporation. Cool continental landmasses from volcanic dust in the atmosphere caused this moisture to fall as snow. One ice age, lasting approximately 700 years, explains all known glacial evidence without requiring multiple ice ages over millions of years.',
    topic_tags: ['ice_age', 'noahs_flood', 'flood_geology'],
    scripture_references: ['Job 38:29-30', 'Genesis 8:1-3'],
    science_domain: 'geology',
    argument_type: 'geology',
    source_url: 'https://www.creationism.org/videos/KentHovind/HovindCollegeCourses_Notebook.pdf',
    source_date: '2004',
  },

  // ═══════════════════════════════════════════════════
  // ANSWERS IN GENESIS (AiG)
  // ═══════════════════════════════════════════════════
  {
    source: 'answers_in_genesis',
    title: 'The Incredible Complexity of the Human Brain',
    content: 'The human brain contains approximately 86 billion neurons, each forming up to 10,000 synaptic connections. The total number of neural connections exceeds the number of stars in the Milky Way galaxy. The brain processes information at speeds equivalent to a supercomputer while consuming only 20 watts of power — a fraction of what any artificial system requires. Materialistic explanations for consciousness — the subjective experience of being a thinking, feeling person — remain entirely inadequate. The brain\'s complexity points to a Designer whose intelligence vastly exceeds what He created.',
    topic_tags: ['human_brain', 'human_body', 'dna_complexity'],
    scripture_references: ['Psalm 139:14', 'Isaiah 40:28', 'Job 38:36'],
    science_domain: 'biology',
    argument_type: 'complexity',
    source_url: 'https://answersingenesis.org/human-body/brain/',
    source_date: '2020',
  },
  {
    source: 'answers_in_genesis',
    title: 'The Cambrian Explosion: Evolution\'s Big Bang Problem',
    content: 'The Cambrian Explosion refers to the sudden appearance of virtually all major animal body plans in the fossil record within a geologically brief window — estimated at 5-10 million years in evolutionary terms. There are no ancestral forms in the layers below. Charles Darwin called this "inexplicable" and hoped future fossil discoveries would fill the gaps. Over 160 years later, the gaps remain. The Cambrian Explosion is exactly what you would expect from Genesis 1: God created distinct kinds of animals fully formed, and they appear in the fossil record fully formed.',
    topic_tags: ['cambrian_explosion', 'missing_links', 'genesis_creation'],
    scripture_references: ['Genesis 1:20-25', 'Genesis 1:21'],
    science_domain: 'biology',
    argument_type: 'origins',
    source_url: 'https://answersingenesis.org/fossils/fossil-record/cambrian-explosion/',
    source_date: '2019',
  },
  {
    source: 'answers_in_genesis',
    title: 'Grand Canyon: Monument to the Flood',
    content: 'The Grand Canyon contains flat, knife-edge contacts between sedimentary layers supposedly separated by millions of years. There is no erosion between them — no soil layers, no root channels, no weathering. The layers were deposited rapidly, one on top of another, while still wet. The canyon itself was carved catastrophically by massive water drainage, not slowly by the Colorado River. When Mount St. Helens erupted in 1980, it carved a 1/40th scale Grand Canyon in a single day through 600 feet of rock. What took one day at small scale could carve the Grand Canyon in weeks at full scale.',
    topic_tags: ['grand_canyon', 'flood_geology', 'noahs_flood'],
    scripture_references: ['Genesis 7:11', 'Genesis 7:19-20', 'Psalm 104:6-9'],
    science_domain: 'geology',
    argument_type: 'geology',
    source_url: 'https://answersingenesis.org/geology/grand-canyon/',
    source_date: '2018',
  },
  {
    source: 'answers_in_genesis',
    title: 'Adam and Eve: Genetics Confirms Biblical History',
    content: 'Mitochondrial DNA studies consistently trace all living humans back to a single woman — dubbed "Mitochondrial Eve" by secular geneticists. Y-chromosome studies similarly trace all men to a single male ancestor. The genetic diversity observed in the human population today is fully consistent with a single founding couple approximately 6,000 years ago, followed by a population bottleneck at the time of the Flood. The Bible\'s account of Adam and Eve as the literal parents of all humanity is not contradicted by genetics — it is confirmed by it.',
    topic_tags: ['adam_and_eve', 'dna_complexity', 'human_body'],
    scripture_references: ['Genesis 2:7', 'Genesis 2:22', 'Acts 17:26', 'Genesis 3:20'],
    science_domain: 'genetics',
    argument_type: 'origins',
    source_url: 'https://answersingenesis.org/genetics/mitochondrial-dna/',
    source_date: '2021',
  },
  {
    source: 'answers_in_genesis',
    title: 'The Immune System: Engineered Defense',
    content: 'The human immune system is a multi-layered defense network of extraordinary complexity. It distinguishes self from non-self among trillions of molecules, maintains a memory bank of every pathogen it has ever encountered, produces targeted antibodies at a rate of 2,000 per second per B-cell, and coordinates attacks using chemical signaling networks that military strategists study for inspiration. The adaptive immune system can generate over 100 billion distinct antibody configurations — more than enough to recognize any pathogen that has ever existed or ever will exist. This is not the product of random mutation. This is engineering.',
    topic_tags: ['immune_system', 'human_body', 'irreducible_complexity'],
    scripture_references: ['Psalm 139:14', 'Job 10:8-12'],
    science_domain: 'biology',
    argument_type: 'complexity',
    source_url: 'https://answersingenesis.org/human-body/immune-system/',
    source_date: '2022',
  },

  // ═══════════════════════════════════════════════════
  // INSTITUTE FOR CREATION RESEARCH (ICR)
  // ═══════════════════════════════════════════════════
  {
    source: 'icr',
    title: 'DNA: The Information Molecule',
    content: 'DNA operates as a digital information storage system with a four-letter chemical alphabet (A, T, G, C). It employs error-correcting codes, redundancy, compression, and hierarchical organization — features that in every other known context are hallmarks of intelligent design. The information in DNA is not reducible to chemistry any more than the meaning of a book is reducible to the chemistry of ink. Information science has established that specified complex information — information that is both complex and functional — always originates from an intelligent source. DNA is the most information-dense storage system known to science.',
    topic_tags: ['dna_complexity', 'genesis_creation', 'human_body'],
    scripture_references: ['Psalm 139:16', 'Jeremiah 1:5', 'Colossians 1:16-17'],
    science_domain: 'genetics',
    argument_type: 'design',
    source_url: 'https://www.icr.org/article/dna-information/',
    source_date: '2019',
  },
  {
    source: 'icr',
    title: 'Young Earth Indicators: The Evidence',
    content: 'Multiple independent lines of evidence point to a young earth: the decay of Earth\'s magnetic field (measured since 1835, halving every 1,400 years — extrapolate back 20,000 years and the field strength would melt the crust), the presence of Carbon-14 in diamonds (diamonds are supposed to be billions of years old, but C-14 has a half-life of only 5,730 years), the accumulation of salt in the ocean (at current rates, the oceans would reach present salinity in 42 million years from pure freshwater — far less than the supposed 4.5 billion year age), and soft tissue found in dinosaur bones (collagen, blood vessels, and red blood cells preserved in T. rex fossils that are supposedly 65 million years old).',
    topic_tags: ['age_of_earth', 'genesis_creation'],
    scripture_references: ['Genesis 1:1', 'Exodus 20:11', 'Genesis 5:1-32'],
    science_domain: 'geology',
    argument_type: 'origins',
    source_url: 'https://www.icr.org/article/evidence-young-world/',
    source_date: '2020',
  },
  {
    source: 'icr',
    title: 'The Limits of Mutation',
    content: 'Mutations are overwhelmingly harmful or neutral — beneficial mutations are extraordinarily rare and always involve loss of information, not gain. No observed mutation has ever added a new functional gene to a genome. Antibiotic resistance in bacteria, often cited as evidence for evolution, involves either pre-existing resistance genes being selected, or loss-of-function mutations that happen to confer resistance as a side effect. Evolution requires the addition of vast quantities of new genetic information. Mutations destroy information. These are opposite processes. Selection can only choose from what already exists — it cannot create what does not.',
    topic_tags: ['mutation_limits', 'natural_selection_limits', 'dna_complexity'],
    scripture_references: ['Genesis 1:11-12', 'Genesis 1:21', 'Genesis 1:24-25'],
    science_domain: 'genetics',
    argument_type: 'refutation',
    source_url: 'https://www.icr.org/article/mutations/',
    source_date: '2021',
  },
  {
    source: 'icr',
    title: 'Flood Geology: Rapid Fossil Formation',
    content: 'Fossils require rapid burial in sediment to prevent decomposition. Animals that die on the surface are consumed by scavengers, bacteria, and weather within weeks. The existence of billions of fossils worldwide — many exquisitely preserved with soft tissue details — requires catastrophic burial. Polystrate fossils (tree trunks extending through multiple sedimentary layers supposedly representing millions of years) demonstrate that those layers were deposited rapidly. Mass fossil graveyards containing jumbled remains of diverse species from different habitats point to a single catastrophic event — a global flood.',
    topic_tags: ['flood_geology', 'noahs_flood', 'flood_evidence_archaeology'],
    scripture_references: ['Genesis 7:21-23', '2 Peter 3:6', 'Psalm 104:6-9'],
    science_domain: 'geology',
    argument_type: 'geology',
    source_url: 'https://www.icr.org/article/flood-fossils/',
    source_date: '2018',
  },

  // ═══════════════════════════════════════════════════
  // CREATION MINISTRIES INTERNATIONAL (CMI)
  // ═══════════════════════════════════════════════════
  {
    source: 'cmi',
    title: 'Genetic Entropy: The Genome Is Deteriorating',
    content: 'Dr. John Sanford, inventor of the gene gun and Cornell University professor, demonstrated in his book "Genetic Entropy and the Mystery of the Genome" that the human genome is deteriorating at a rate that makes long evolutionary timescales impossible. Each generation accumulates approximately 100-300 new mutations. Natural selection cannot remove the vast majority of these because they are too slight in effect. The genome is on an irreversible downward trajectory — which is consistent with a recent creation followed by the Fall, but fatal to any model requiring millions of years of upward genetic progress.',
    topic_tags: ['mutation_limits', 'dna_complexity', 'adam_and_eve'],
    scripture_references: ['Romans 8:22', 'Genesis 3:17-19', 'Romans 5:12'],
    science_domain: 'genetics',
    argument_type: 'refutation',
    source_url: 'https://creation.com/genetic-entropy',
    source_date: '2019',
  },
  {
    source: 'cmi',
    title: 'Information Theory and the Origin of Life',
    content: 'The simplest self-reproducing organism requires a minimum of approximately 250 genes encoding about 250,000 base pairs of DNA. The probability of this information arising by chance chemistry has been calculated by multiple researchers to be effectively zero — far below the universal probability bound. Dr. Werner Gitt, former director of the German Federal Institute of Physics and Technology, has formulated the scientific laws of information: information always comes from an intelligent sender, requires a code and syntax agreed upon by sender and receiver, and always has an intended purpose. DNA meets every criterion of designed information.',
    topic_tags: ['dna_complexity', 'genesis_creation', 'irreducible_complexity'],
    scripture_references: ['Genesis 1:1', 'John 1:1-3', 'Colossians 1:16-17'],
    science_domain: 'genetics',
    argument_type: 'design',
    source_url: 'https://creation.com/information-theory-life/',
    source_date: '2020',
  },
  {
    source: 'cmi',
    title: 'Worldwide Flood Legends',
    content: 'Over 270 ancient cultures worldwide preserve flood traditions — including cultures with no contact with each other or with the Bible. The details consistently include: global destruction by water, a righteous man warned in advance, animals saved on a vessel, and a fresh start after the waters recede. The Gilgamesh Epic, the Hindu Matsya Purana, the Chinese Gun-Yu legend, the Australian Aboriginal dreamtime flood, and the Native American flood stories all share these core elements. The simplest explanation for hundreds of independent cultures sharing the same story is that the event actually happened.',
    topic_tags: ['noahs_flood', 'flood_evidence_archaeology', 'biblical_archaeology'],
    scripture_references: ['Genesis 6:13-22', 'Genesis 7:17-24', '2 Peter 2:5'],
    science_domain: 'archaeology',
    argument_type: 'geology',
    source_url: 'https://creation.com/flood-legends',
    source_date: '2017',
  },

  // ═══════════════════════════════════════════════════
  // DISCOVERY INSTITUTE
  // ═══════════════════════════════════════════════════
  {
    source: 'discovery_institute',
    title: 'Irreducible Complexity: The Bacterial Flagellum',
    content: 'The bacterial flagellum is a rotary motor composed of approximately 40 different protein parts, spinning at up to 100,000 RPM with near-perfect energy efficiency. It includes a stator, rotor, drive shaft, bushing, universal joint, and propeller — components that mirror human-designed outboard motors. Remove any single protein component and the motor ceases to function. Dr. Michael Behe coined the term "irreducible complexity" to describe systems that cannot function with any part removed and therefore could not have evolved gradually. The flagellum remains one of the strongest examples of design at the molecular level.',
    topic_tags: ['irreducible_complexity', 'human_body', 'genesis_creation'],
    scripture_references: ['Romans 1:20', 'Psalm 19:1'],
    science_domain: 'biology',
    argument_type: 'complexity',
    source_url: 'https://www.discovery.org/a/bacterial-flagellum/',
    source_date: '2019',
  },
  {
    source: 'discovery_institute',
    title: 'Fine-Tuning of the Universe',
    content: 'The fundamental physical constants of the universe are fine-tuned to an extraordinary degree for the existence of life. The gravitational constant, the electromagnetic force, the strong nuclear force, the cosmological constant, and dozens of other parameters must fall within impossibly narrow ranges. Roger Penrose calculated that the probability of the universe\'s low-entropy initial conditions arising by chance is 1 in 10^(10^123) — a number so large that writing a zero for every particle in the observable universe would not come close to representing it. The multiverse hypothesis, proposed to avoid the design implication, is untestable and unfalsifiable — it is metaphysics, not science.',
    topic_tags: ['fine_tuning', 'big_bang_problems', 'genesis_creation'],
    scripture_references: ['Genesis 1:1', 'Isaiah 45:18', 'Jeremiah 10:12'],
    science_domain: 'physics',
    argument_type: 'design',
    source_url: 'https://www.discovery.org/a/fine-tuning/',
    source_date: '2020',
  },
  {
    source: 'discovery_institute',
    title: 'The Mystery of Consciousness',
    content: 'Consciousness — the subjective experience of being aware, of having a first-person perspective, of experiencing qualia like the redness of red or the pain of a headache — remains completely unexplained by materialistic neuroscience. No arrangement of physical matter has ever been shown to produce subjective experience. The "hard problem of consciousness," as philosopher David Chalmers termed it, is not a gap in current knowledge waiting to be filled — it is a fundamental category error to assume that objective physical processes can produce subjective experience. Consciousness points to a non-material dimension of reality that materialism cannot account for.',
    topic_tags: ['human_brain', 'human_body', 'genesis_creation'],
    scripture_references: ['Genesis 2:7', 'Ecclesiastes 12:7', 'Job 32:8'],
    science_domain: 'biology',
    argument_type: 'design',
    source_url: 'https://www.discovery.org/a/consciousness/',
    source_date: '2021',
  },
  {
    source: 'discovery_institute',
    title: 'Starlight and the Young Earth',
    content: 'The distant starlight problem — how light from stars billions of light-years away can reach a young earth — has several proposed solutions within the creationist framework. Dr. Russell Humphreys\' white hole cosmology proposes that gravitational time dilation during the expansion of space could allow billions of years to pass at the edges of the universe while only days pass on earth. Dr. Jason Lisle\'s Anisotropic Synchrony Convention notes that the one-way speed of light has never been measured — only the round-trip speed. Einstein himself acknowledged that the one-way speed is a convention, not a measurement. The distant starlight problem is a challenge, but it is not the proof of an old universe that it is often claimed to be.',
    topic_tags: ['starlight', 'age_of_earth', 'big_bang_problems'],
    scripture_references: ['Genesis 1:14-19', 'Psalm 147:4', 'Isaiah 40:26'],
    science_domain: 'astronomy',
    argument_type: 'astronomy',
    source_url: 'https://evolutionnews.org/starlight-young-earth/',
    source_date: '2018',
  },

  // ═══════════════════════════════════════════════════
  // ADDITIONAL TOPIC COVERAGE
  // ═══════════════════════════════════════════════════
  {
    source: 'answers_in_genesis',
    title: 'Six-Day Creation: What Does the Text Say?',
    content: 'The Hebrew word "yom" (day) when used with a number (first day, second day) and with "evening and morning" always means a literal 24-hour day throughout the Old Testament — without exception. Outside Genesis 1, this construction appears over 400 times and always means a normal day. Exodus 20:11 confirms the straightforward reading: "For in six days the LORD made heaven and earth, the sea, and all that in them is, and rested the seventh day." The Sabbath commandment only makes sense if the creation days were the same kind of days as the Sabbath day.',
    topic_tags: ['genesis_creation', 'age_of_earth'],
    scripture_references: ['Genesis 1:5', 'Genesis 1:8', 'Genesis 1:13', 'Exodus 20:11'],
    science_domain: 'biology',
    argument_type: 'origins',
    source_url: 'https://answersingenesis.org/days-of-creation/',
    source_date: '2017',
  },
  {
    source: 'icr',
    title: 'Archaeological Confirmation of the Exodus',
    content: 'Archaeological evidence for the Exodus continues to accumulate. The Ipuwer Papyrus describes plagues in Egypt remarkably similar to those in Exodus. The Berlin Pedestal contains what appears to be the earliest extra-biblical reference to Israel. Chariot wheels and human bones have been identified on the seabed of the Gulf of Aqaba at the Nuweiba crossing point. The traditional site of Mount Sinai at Jabal al-Lawz in Saudi Arabia shows a blackened peak, a split rock with water erosion, and an altar site with petroglyphs of cattle — consistent with the golden calf incident.',
    topic_tags: ['exodus_evidence', 'biblical_archaeology'],
    scripture_references: ['Exodus 14:21-28', 'Exodus 19:18', 'Exodus 32:1-6'],
    science_domain: 'archaeology',
    argument_type: 'origins',
    source_url: 'https://www.icr.org/article/exodus-evidence/',
    source_date: '2020',
  },
  {
    source: 'hovind',
    title: 'Seminar 7 — Questions and Answers: Evolution and Education',
    content: 'Evolution is the only theory in science that is protected from criticism in public education. Students are taught that the Big Bang produced everything from nothing, that life arose spontaneously from non-living chemicals, that fish evolved into amphibians, that reptiles evolved into birds, and that apes evolved into humans — yet none of these transitions has ever been observed, replicated, or demonstrated in a laboratory. Every other field of science requires observable, repeatable evidence. Evolution gets a pass. If creation science were given equal time in classrooms, students could evaluate the evidence and decide for themselves.',
    topic_tags: ['textbook_errors', 'evolution_fraud', 'natural_selection_limits'],
    scripture_references: ['Proverbs 22:6', 'Colossians 2:8', 'Romans 1:22'],
    science_domain: 'biology',
    argument_type: 'refutation',
    source_url: 'https://archive.org/details/creation-science-evangelism-seminar-1999-edition',
    source_date: '1999',
  },
  {
    source: 'cmi',
    title: 'The Heavens Declare: Astronomy and Creation',
    content: 'The heavens declare the glory of God in ways that modern astronomy continues to confirm. The Earth occupies a privileged position in the universe — not at the center, but in a location ideal for both life and scientific observation. The galactic habitable zone, the circumstellar habitable zone, and the dozens of planetary parameters required for life all point to Earth being specifically designed for habitation, exactly as Isaiah 45:18 declares: God "formed the earth and made it; he hath established it, he created it not in vain, he formed it to be inhabited."',
    topic_tags: ['fine_tuning', 'genesis_creation'],
    scripture_references: ['Psalm 19:1', 'Isaiah 45:18', 'Genesis 1:14-19'],
    science_domain: 'astronomy',
    argument_type: 'astronomy',
    source_url: 'https://creation.com/astronomy-creation',
    source_date: '2019',
  },
]

async function seed() {
  console.log(`Seeding ${entries.length} Creation Witness entries...`)

  // Clear existing entries to avoid duplicates on re-run
  await supabase.from('creation_witness').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Insert in batches of 10
  for (let i = 0; i < entries.length; i += 10) {
    const batch = entries.slice(i, i + 10)
    const { error } = await supabase.from('creation_witness').insert(batch)
    if (error) {
      console.error(`Error inserting batch ${i / 10 + 1}:`, error.message)
    } else {
      console.log(`  Batch ${i / 10 + 1} inserted (${batch.length} entries)`)
    }
  }

  // Verify
  const { count } = await supabase.from('creation_witness').select('*', { count: 'exact', head: true })
  console.log(`Done. Total entries in creation_witness: ${count}`)
}

seed().catch(console.error)
