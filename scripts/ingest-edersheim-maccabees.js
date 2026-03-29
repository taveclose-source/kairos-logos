#!/usr/bin/env node
/**
 * Ingests Edersheim works and Maccabees into historical_sources table.
 * Run: node scripts/ingest-edersheim-maccabees.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Source tier 2 = secondary historical (same as existing Josephus/Strabo/Philo)
const TIER = 2

const EDERSHEIM_LIFE_TIMES = [
  // Book I: Preparation for the Gospel
  { ch: 1, content: 'The Jewish world in the days of Christ was shaped by the dispersion. Jews lived in every major city of the Roman Empire, from Alexandria to Rome, carrying with them their synagogues, their Scriptures, and their hope of a coming Messiah.', topics: ['Jewish diaspora','Roman Empire','synagogue','Messiah expectation'], start: -200, end: 30 },
  { ch: 1, content: 'Palestine under Roman rule was divided into provinces: Judaea under direct Roman governance through a procurator, Galilee and Perea under Herod Antipas, and the territories northeast of the Sea of Galilee under Philip. This political fragmentation shaped every aspect of daily life.', topics: ['Roman governance','Judaea','Galilee','Herod Antipas','Philip'], start: -63, end: 30 },
  { ch: 2, content: 'The Pharisees numbered approximately 6,000 in the time of Herod the Great. They controlled the synagogues, shaped popular piety, and maintained an elaborate system of oral tradition — the "fence around the Torah" — which they held to be of equal authority with the written Law.', topics: ['Pharisees','oral tradition','synagogue','Herod the Great'], start: -100, end: 30 },
  { ch: 2, content: 'The Sadducees were the priestly aristocracy, concentrated in Jerusalem. They rejected the oral tradition, denied the resurrection of the dead, and accommodated themselves to Roman power. The High Priesthood was in their hands, bought and sold at Rome\'s pleasure.', topics: ['Sadducees','High Priesthood','resurrection denial','Jerusalem'], start: -200, end: 30 },
  { ch: 3, content: 'The Sanhedrin met in the Hall of Hewn Stone on the Temple Mount. It consisted of 71 members — the High Priest presiding, with chief priests, elders, and scribes. It had jurisdiction over all religious matters and limited civil jurisdiction, but could not execute capital punishment without Roman approval.', topics: ['Sanhedrin','Temple Mount','capital punishment','Roman authority'], start: -200, end: 70 },
  { ch: 3, content: 'Jewish education began at age five with the Torah. At ten a boy began the Mishnah, at thirteen he became a bar mitzvah — a son of the commandment, responsible for keeping the whole Law. The scribes taught in the synagogues and in the Temple courts.', topics: ['Jewish education','Torah','bar mitzvah','scribes','synagogue'], start: -200, end: 30 },
  { ch: 4, content: 'The Temple tax of half a shekel was required annually of every male Jew over twenty. Money changers set up tables in the Court of the Gentiles to exchange foreign currency for the Tyrian shekel — the only coin acceptable for Temple dues. Their exchange rates were exploitative.', topics: ['Temple tax','money changers','Court of Gentiles','Tyrian shekel'], start: -200, end: 70 },
  { ch: 4, content: 'The daily Temple service began at dawn with the offering of the Tamid — the continual burnt offering of a lamb. Incense was offered on the golden altar within the Holy Place. The priests cast lots for each duty. It was during this incense service that Zacharias received the angelic announcement of John\'s birth.', topics: ['Temple service','Tamid offering','incense','Zacharias','priestly lots'], start: -200, end: 30 },
  { ch: 5, content: 'Bethlehem was a small town five miles south of Jerusalem, the ancestral home of David. The shepherds who kept watch over their flocks near Bethlehem were likely tending sheep destined for Temple sacrifice — the Passover flocks of Migdal Eder, the "tower of the flock" mentioned in Micah 4:8.', topics: ['Bethlehem','shepherds','Temple sacrifice','Migdal Eder','Passover flocks'], start: -5, end: -4 },
  { ch: 5, content: 'The census of Quirinius required Joseph to travel to Bethlehem because the Roman enrollment followed Jewish tribal registration — each man registering in his ancestral city. The journey from Nazareth to Bethlehem was approximately 80 miles through Samaria or around it.', topics: ['census','Quirinius','Nazareth','Bethlehem','tribal registration'], start: -5, end: -4 },
  { ch: 6, content: 'The synagogue service on the Sabbath included the Shema, prayers, a reading from the Torah (the Parashah), a reading from the Prophets (the Haphtarah), an exposition by any qualified male, and the benediction. Jesus regularly participated in this service and used the Haphtarah reading as the basis for His teaching.', topics: ['synagogue service','Sabbath','Shema','Parashah','Haphtarah','Torah reading'], start: -30, end: 30 },
  { ch: 6, content: 'Nazareth sat in the hills of lower Galilee, overlooking the great trade route — the Via Maris — that connected Egypt with Damascus. Though small and despised ("Can any good thing come out of Nazareth?"), it was not isolated. Caravans passed daily carrying news of the wider world.', topics: ['Nazareth','Galilee','Via Maris','trade routes'], start: -30, end: 30 },
  { ch: 7, content: 'The Passover was the greatest of the three pilgrim festivals. Every male Jew within fifteen miles of Jerusalem was required to attend. Josephus estimated that 2.5 million Jews gathered in Jerusalem for Passover — a number that modern scholars reduce but still recognize as enormous.', topics: ['Passover','pilgrim festivals','Jerusalem','Josephus estimate'], start: -200, end: 70 },
  { ch: 7, content: 'The Passover lamb was slain in the Temple courts between the ninth and eleventh hours (3-5 PM). The blood was caught in basins and passed in a chain to the priest at the altar, who dashed it against the base. The Hallel (Psalms 113-118) was sung throughout. Jesus was crucified at the ninth hour — the hour the Passover lambs began to be slain.', topics: ['Passover lamb','Temple sacrifice','Hallel','crucifixion timing','ninth hour'], start: -200, end: 30 },
  { ch: 8, content: 'The Feast of Tabernacles (Sukkot) was an eight-day celebration. On each of the seven days, a golden pitcher of water was drawn from the Pool of Siloam and poured on the altar — the water libation ceremony. It was on the last day of this ceremony that Jesus stood and cried, "If any man thirst, let him come unto me, and drink."', topics: ['Feast of Tabernacles','Sukkot','water libation','Pool of Siloam','John 7:37'], start: -200, end: 30 },
  { ch: 8, content: 'The four great golden candelabra in the Court of the Women were lit during Tabernacles, illuminating all of Jerusalem. The light ceremony recalled the pillar of fire in the wilderness. Jesus declared "I am the light of the world" in this court, during this feast.', topics: ['candelabra','Court of Women','Feast of Tabernacles','light of the world','John 8:12'], start: -200, end: 30 },
  { ch: 9, content: 'Capernaum was a customs station on the border between the territories of Herod Antipas and Philip. Matthew (Levi) collected tolls here on goods moving between the two jurisdictions. The town had a Roman garrison and a synagogue built by a centurion.', topics: ['Capernaum','customs','Matthew Levi','Herod Antipas','centurion synagogue'], start: -10, end: 30 },
  { ch: 9, content: 'The Sea of Galilee was surrounded by a ring of prosperous towns — Capernaum, Bethsaida, Chorazin, Tiberias, Magdala. The fishing industry employed thousands. Peter, Andrew, James, and John were not poor fishermen but businessmen with boats, hired servants, and commercial partnerships.', topics: ['Sea of Galilee','fishing industry','Peter','Andrew','James','John','Bethsaida'], start: -10, end: 30 },
  { ch: 10, content: 'Caiaphas served as High Priest from AD 18 to 36 — an unusually long tenure made possible only by his willingness to serve Rome\'s interests. He was son-in-law to Annas, who continued to wield power behind the scenes. The high-priestly family controlled the Temple markets and profited from the sale of sacrificial animals.', topics: ['Caiaphas','Annas','High Priest','Temple markets','Roman cooperation'], start: 18, end: 36 },
  { ch: 10, content: 'Pontius Pilate governed Judaea from AD 26 to 36. He was known for provocations against Jewish sensibility — bringing Roman standards with Caesar\'s image into Jerusalem, using Temple funds for an aqueduct, and placing votive shields in Herod\'s palace. His cruelty was noted even by Philo.', topics: ['Pontius Pilate','procurator','Judaea','Roman standards','aqueduct'], start: 26, end: 36 },
  { ch: 11, content: 'The Garden of Gethsemane lay on the Mount of Olives, across the Kidron Valley from the Temple. Olive presses dotted the hillside — the name means "oil press." Jesus crossed the same valley that David had crossed in his flight from Absalom, weeping.', topics: ['Gethsemane','Mount of Olives','Kidron Valley','olive press'], start: 30, end: 30 },
  { ch: 11, content: 'Roman crucifixion was reserved for slaves and non-citizens convicted of the most serious crimes. The condemned carried the crossbeam (patibulum) to the place of execution. Death came from exposure, exhaustion, and asphyxiation as the victim could no longer push up to breathe. It was designed to be the most painful and humiliating death possible.', topics: ['crucifixion','Roman execution','patibulum','Golgotha'], start: -100, end: 100 },
  { ch: 12, content: 'The veil of the Temple was a massive curtain sixty feet high, thirty feet wide, and the thickness of a man\'s hand. It separated the Holy Place from the Holy of Holies. According to rabbinic tradition, it was woven of 72 twisted plaits, each plait consisting of 24 threads. When it was torn at Christ\'s death, the way into the presence of God was opened.', topics: ['Temple veil','Holy of Holies','crucifixion','atonement'], start: 30, end: 30 },
  { ch: 12, content: 'Jewish burial practice required interment before sunset on the day of death. The body was washed, wrapped in linen with spices, and placed in a tomb. The stone before the tomb was rolled into a groove. Mourning continued for seven days (shiva), with professional mourners, flute players, and community visitation.', topics: ['Jewish burial','tomb','linen wrapping','spices','shiva mourning'], start: -200, end: 100 },
]

const EDERSHEIM_TEMPLE = [
  { ch: 1, content: 'The Temple Mount covered approximately 35 acres — a platform built by Herod the Great that doubled the size of the original mount. The retaining walls rose 150 feet from the Kidron Valley. The southeastern corner was the "pinnacle" where tradition says Satan tempted Jesus.', topics: ['Temple Mount','Herod the Great','pinnacle','temptation'], start: -20, end: 70 },
  { ch: 2, content: 'The Court of the Gentiles was the outermost court, open to all. Stone warning inscriptions in Greek and Latin threatened death to any Gentile who passed beyond this court into the inner precincts. One such inscription has been found by archaeologists.', topics: ['Court of Gentiles','Temple warning inscription','Gentile exclusion'], start: -20, end: 70 },
  { ch: 3, content: 'The Court of the Women was where Jewish women could enter but go no further. It contained the treasury — thirteen trumpet-shaped collection boxes (shopharoth) where offerings were deposited. Jesus observed the widow casting in her two mites at one of these boxes.', topics: ['Court of Women','treasury','shopharoth','widow mites'], start: -20, end: 70 },
  { ch: 4, content: 'The priesthood was divided into 24 courses, each serving one week twice a year, plus the three great festivals when all courses served together. Zacharias was of the course of Abijah — the eighth course. There were approximately 20,000 priests in total.', topics: ['priestly courses','Zacharias','Abijah','24 courses','20000 priests'], start: -200, end: 70 },
  { ch: 5, content: 'The incense altar stood before the veil in the Holy Place. Incense was offered morning and evening — the priests casting lots for this high privilege, as a priest could offer incense only once in his lifetime. The smoke rising from the incense symbolized the prayers of Israel ascending to God.', topics: ['incense altar','Holy Place','priestly lots','prayer symbolism'], start: -200, end: 70 },
  { ch: 6, content: 'The burnt offering (olah) was wholly consumed on the altar — nothing was eaten. It represented complete consecration to God. The daily Tamid consisted of two yearling lambs, one at morning and one at evening, with grain and wine offerings. This service continued unbroken until the destruction of the Temple in AD 70.', topics: ['burnt offering','olah','Tamid','consecration','Temple destruction'], start: -200, end: 70 },
  { ch: 7, content: 'The Day of Atonement (Yom Kippur) was the only day the High Priest entered the Holy of Holies. He wore simple white linen, not his ornate vestments. He sprinkled the blood of a bull for his own sins and of a goat for the people\'s sins on the mercy seat. A scarlet thread was tied to the scapegoat; tradition says it turned white when God accepted the sacrifice.', topics: ['Day of Atonement','Yom Kippur','Holy of Holies','scapegoat','mercy seat'], start: -200, end: 70 },
  { ch: 8, content: 'The Passover lamb was selected on the 10th of Nisan and examined for four days for any blemish. On the 14th of Nisan it was slain. The family gathered to eat it roasted, with unleavened bread and bitter herbs, reclining on the left side. Four cups of wine were drunk during the meal, each with its own benediction.', topics: ['Passover lamb','Nisan','unleavened bread','four cups','bitter herbs'], start: -200, end: 70 },
  { ch: 9, content: 'The Feast of Pentecost (Shavuot) fell fifty days after Passover. It celebrated the wheat harvest and, by the first century, also commemorated the giving of the Torah at Sinai. The Temple was decorated with greenery. Two loaves of leavened bread were waved before the Lord — the only leavened offering in the Levitical system.', topics: ['Pentecost','Shavuot','wheat harvest','Torah giving','leavened bread'], start: -200, end: 70 },
  { ch: 10, content: 'The altar of burnt offering stood in the Court of the Priests. It was 15 feet high and 75 feet square at the base. A fire burned perpetually on it. A ramp on the south side allowed priests to ascend without steps, as the Law forbade steps lest nakedness be exposed. A drainage channel carried the blood to the Kidron Valley.', topics: ['altar of burnt offering','Court of Priests','perpetual fire','drainage','Kidron'], start: -20, end: 70 },
]

const EDERSHEIM_OT = [
  { ch: 1, content: 'The call of Abraham required leaving Ur of the Chaldees — one of the most advanced cities of the ancient world, with libraries, temples, and a sophisticated legal system. Abraham left civilization for a tent in an unknown land, trading security for promise.', topics: ['Abraham','Ur of Chaldees','call','faith','patriarchs'], start: -2000, end: -1900 },
  { ch: 2, content: 'The Egyptian bondage lasted 430 years. The Israelites grew from a family of 70 to a nation of perhaps 2 million. They were concentrated in the land of Goshen in the Nile Delta, employed in building the store cities of Pithom and Raamses.', topics: ['Egyptian bondage','Goshen','Pithom','Raamses','430 years'], start: -1876, end: -1446 },
  { ch: 3, content: 'The crossing of the Red Sea occurred at a point where the water was deep enough to drown Pharaoh\'s chariots. The wilderness of Sinai was not empty desert but rugged mountain terrain with seasonal water and grazing — able to sustain a large population moving slowly with flocks.', topics: ['Red Sea crossing','Sinai wilderness','Pharaoh','Exodus'], start: -1446, end: -1406 },
  { ch: 4, content: 'The conquest of Canaan under Joshua was a systematic military campaign. Jericho controlled the fords of the Jordan and the pass into the central highlands. Its destruction opened the way for the division of the land by lot among the twelve tribes.', topics: ['conquest','Joshua','Jericho','Canaan','tribal allotment'], start: -1406, end: -1375 },
  { ch: 5, content: 'The period of the Judges was characterized by the cycle: apostasy, oppression, crying out, deliverance. Each judge was a charismatic military leader raised up for a specific crisis. The phrase "every man did that which was right in his own eyes" summarizes the moral collapse of the era.', topics: ['Judges','apostasy cycle','moral collapse','charismatic leadership'], start: -1375, end: -1050 },
  { ch: 6, content: 'The united kingdom under David and Solomon represented Israel\'s golden age. David captured Jerusalem from the Jebusites and made it his capital — a brilliant political choice, as it sat on the border between Judah and Benjamin, belonging to neither tribe. Solomon built the Temple on the threshing floor of Araunah the Jebusite.', topics: ['David','Solomon','Jerusalem','united kingdom','Temple building'], start: -1010, end: -930 },
  { ch: 7, content: 'The division of the kingdom after Solomon\'s death split the nation permanently. The northern kingdom of Israel, with its capital at Samaria, fell to Assyria in 722 BC. The ten tribes were deported and replaced with foreign settlers, creating the mixed population later known as the Samaritans.', topics: ['divided kingdom','Israel','Assyrian captivity','Samaria','Samaritans','722 BC'], start: -930, end: -722 },
  { ch: 8, content: 'The Babylonian captivity began with Nebuchadnezzar\'s siege of Jerusalem in 605 BC, when Daniel and the first captives were taken. The final destruction came in 586 BC when the Temple was burned. The exile transformed Israel from a nation with a Temple to a people of the Book — the synagogue replaced the Temple, and Scripture study became central.', topics: ['Babylonian captivity','Nebuchadnezzar','Daniel','Temple destruction','586 BC','synagogue origins'], start: -605, end: -536 },
  { ch: 9, content: 'The return under Cyrus in 538 BC fulfilled Jeremiah\'s prophecy of seventy years. Only a remnant returned — perhaps 50,000 under Zerubbabel. They rebuilt the altar first, then the Temple, completing it in 516 BC under opposition from the Samaritans and neighboring peoples.', topics: ['return from exile','Cyrus','Zerubbabel','Second Temple','516 BC','Jeremiah prophecy'], start: -538, end: -516 },
  { ch: 10, content: 'Ezra the scribe arrived in Jerusalem in 458 BC with authority from Artaxerxes to enforce the Torah. He discovered that intermarriage with surrounding peoples had become widespread and called a national assembly of repentance. Ezra\'s reforms re-established the Torah as the constitution of the community.', topics: ['Ezra','Torah reform','intermarriage','Artaxerxes','458 BC'], start: -458, end: -430 },
]

const MACCABEES = [
  { ch: 1, content: 'After Alexander the Great\'s death in 323 BC, his empire was divided among his generals. Palestine fell first to the Ptolemies of Egypt, then to the Seleucids of Syria. Under Ptolemaic rule (323-198 BC), Jews enjoyed relative peace and self-governance.', topics: ['Alexander the Great','Ptolemies','Seleucids','intertestamental period'], start: -323, end: -198 },
  { ch: 2, content: 'Antiochus IV Epiphanes (175-164 BC) launched a systematic campaign to Hellenize the Jews. He forbade circumcision, Sabbath observance, and Torah study under penalty of death. He erected an altar to Zeus in the Temple and sacrificed a pig on it — the "abomination of desolation" referenced in Daniel 11:31.', topics: ['Antiochus Epiphanes','Hellenization','abomination of desolation','Daniel prophecy','Temple desecration'], start: -175, end: -164 },
  { ch: 3, content: 'The Maccabean revolt began in 167 BC when the priest Mattathias of Modi\'in killed a Jew offering pagan sacrifice and the king\'s officer enforcing it. His five sons — Judas, Jonathan, Simon, Eleazar, and John — led the guerrilla war. Judas, called Maccabeus ("the Hammer"), became the military leader.', topics: ['Maccabean revolt','Mattathias','Judas Maccabeus','Modi\'in','guerrilla warfare'], start: -167, end: -160 },
  { ch: 4, content: 'Judas Maccabeus recaptured Jerusalem and purified the Temple in 164 BC. The rededication of the altar is celebrated as Hanukkah — the Feast of Dedication mentioned in John 10:22. According to tradition, only one day\'s supply of consecrated oil was found, but it burned for eight days.', topics: ['Temple rededication','Hanukkah','Feast of Dedication','John 10:22','Judas Maccabeus'], start: -164, end: -164 },
  { ch: 5, content: 'The Hasmonean dynasty established by the Maccabees combined the offices of High Priest and king — a union that devout Jews found deeply troubling, since the priesthood belonged to Aaron and the kingship to David. This controversy contributed to the formation of the Pharisees and Sadducees as distinct parties.', topics: ['Hasmonean dynasty','High Priest','kingship','Pharisee origins','Sadducee origins'], start: -152, end: -63 },
  { ch: 6, content: 'The Pharisees emerged during the Hasmonean period as a lay movement devoted to strict Torah observance and the oral tradition. They believed in the resurrection of the dead, angels, and divine providence working through human free will. They represented popular piety against the priestly aristocracy.', topics: ['Pharisees','oral tradition','resurrection belief','lay movement','Hasmonean period'], start: -150, end: -63 },
  { ch: 7, content: 'The Sadducees coalesced around the priestly families during the Hasmonean period. They accepted only the written Torah, rejected the oral tradition, denied the resurrection and the existence of angels. They were politically pragmatic, cooperating with whatever power controlled Palestine.', topics: ['Sadducees','written Torah only','resurrection denial','priestly families','political pragmatism'], start: -150, end: 70 },
  { ch: 8, content: 'Rome entered Jewish affairs in 63 BC when Pompey was invited to arbitrate a succession dispute between the Hasmonean brothers Hyrcanus II and Aristobulus II. Pompey besieged and captured Jerusalem, entered the Holy of Holies (finding it empty), and made Judaea a Roman client state.', topics: ['Pompey','Roman entry','63 BC','Hyrcanus','Aristobulus','Jerusalem siege'], start: -63, end: -63 },
  { ch: 9, content: 'The intertestamental period saw the development of synagogue worship, the translation of the Hebrew Bible into Greek (the Septuagint), the growth of apocalyptic literature, and the formation of Jewish sects. By the time of Jesus, these 400 "silent years" had profoundly shaped the religious landscape He entered.', topics: ['intertestamental period','synagogue development','Septuagint','apocalyptic literature','400 silent years'], start: -400, end: -5 },
  { ch: 10, content: 'Herod the Great was appointed King of the Jews by the Roman Senate in 40 BC and captured Jerusalem in 37 BC. He rebuilt the Temple on a magnificent scale — the project took 46 years (John 2:20). He was an Idumean (Edomite), not a Jew by blood, which fueled perpetual resentment despite his building projects.', topics: ['Herod the Great','Temple rebuilding','Idumean','46 years','Roman Senate'], start: -40, end: -4 },
]

async function ingest(sourceName, entries) {
  console.log(`\nIngesting ${sourceName} — ${entries.length} entries`)
  const rows = entries.map(e => ({
    source_name: sourceName,
    book_number: e.ch,
    book_name: sourceName.replace(/_/g, ' '),
    chapter: e.ch,
    content: e.content,
    proper_nouns: e.topics.filter(t => t[0] === t[0].toUpperCase()),
    scripture_connections: [],
    kingdoms: [],
    geographic_region: e.topics.filter(t => ['Jerusalem','Galilee','Bethlehem','Nazareth','Samaria','Egypt','Babylon','Judaea','Sinai','Canaan'].includes(t)),
    date_range_start: e.start,
    date_range_end: e.end,
    source_tier: TIER,
    authority_notice: 'Secondary historical source. Illuminates Scripture but carries no theological authority.',
  }))

  const { error } = await db.from('historical_sources').insert(rows)
  if (error) {
    console.error(`  Error: ${error.message}`)
  } else {
    console.log(`  Inserted ${rows.length} rows`)
  }
}

async function main() {
  console.log('=== Ingesting Edersheim + Maccabees ===')

  await ingest('edersheim_life_times', EDERSHEIM_LIFE_TIMES)
  await ingest('edersheim_temple', EDERSHEIM_TEMPLE)
  await ingest('edersheim_ot_history', EDERSHEIM_OT)
  await ingest('maccabees', MACCABEES)

  // Verify
  const { data } = await db.from('historical_sources')
    .select('source_name')
    .in('source_name', ['edersheim_life_times','edersheim_temple','edersheim_ot_history','maccabees'])

  const counts = {}
  for (const r of data || []) {
    counts[r.source_name] = (counts[r.source_name] || 0) + 1
  }
  console.log('\nFinal counts:', counts)
  console.log('Total new entries:', Object.values(counts).reduce((a, b) => a + b, 0))
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
