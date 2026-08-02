/*
 * AURA ATLAS — all game content lives in this one file.
 * Edit any text, refresh the page, done. No build step.
 *
 * Shape: meta, quiz (archetype diagnosis), archetypes, titles (endings,
 * highest min-percentage first), cities[] each with 7 scenarios (the 7th
 * is the boss). Every choice has an aura delta (multiple of 50) and
 * feedback; every scenario has a fieldNote citing the underlying idea.
 * The engine (index.html) adapts to any number of cities/scenarios.
 */
window.AURA_CONTENT = {
  "meta": {
    "tagline": "Five cities. Thirty-five choices. A world tour for your self-respect — money, ambition, wit, boundaries and inner game, one scenario at a time.",
    "mission": "The tour: five cities, each holding one thing nobody taught you. Mumbai holds the money scripts. New York holds the ask. London holds the play. Berlin holds the line. Tokyo holds the craft. Nothing here is about impressing anyone — it's about becoming someone you don't have to perform.",
    "outro": "Field notes draw on Rory Sutherland, Morgan Housel, Naval Ravikant, Ramit Sethi, Mark Manson, Ichiro Kishimi & Fumitake Koga, and field research. Built with love, zero ads, zero servers."
  },
  "quiz": [
    {
      "q": "It's Friday night. Someone from work invites you to a thing where you'll know nobody. You…",
      "options": [
        {
          "arch": "overthinker",
          "text": "Say yes, then spend four hours pre-writing conversation topics you will never use."
        },
        {
          "arch": "pleaser",
          "text": "Say yes because saying no felt rude — even though you're exhausted and don't want to go."
        },
        {
          "arch": "grinder",
          "text": "Say no. You have a side project, and sleep is for the funded."
        },
        {
          "arch": "ghost",
          "text": "Leave it on read and watch the invite expire like milk."
        }
      ]
    },
    {
      "q": "There's a text sitting in your drafts. It says something honest. What's its status?",
      "options": [
        {
          "arch": "ghost",
          "text": "It will die in drafts. It's safer there."
        },
        {
          "arch": "overthinker",
          "text": "Day three. Eleven rewrites. You're now researching whether the emoji changes the tone."
        },
        {
          "arch": "grinder",
          "text": "What text? You replied with a voice note about your goals."
        },
        {
          "arch": "pleaser",
          "text": "Sent instantly — wrapped in three apologies and a 'no worries if not!'"
        }
      ]
    },
    {
      "q": "Be honest. What's the actual fear underneath it all?",
      "options": [
        {
          "arch": "pleaser",
          "text": "Being disliked — so you sand your edges off until there's nothing left to dislike, or like."
        },
        {
          "arch": "ghost",
          "text": "Being seen trying and failing — so you only try in private, where nothing counts."
        },
        {
          "arch": "overthinker",
          "text": "Choosing wrong — so you keep every option open forever and pick none of them."
        },
        {
          "arch": "grinder",
          "text": "Being ordinary — so you never stop performing long enough to find out."
        }
      ]
    }
  ],
  "archetypes": {
    "overthinker": {
      "emoji": "🌀",
      "name": "The Overthinker",
      "tag": "Analysis until paralysis",
      "desc": "You have run more simulations than a hedge fund and executed fewer trades than a statue. Every unsent text, every un-asked question — annotated, versioned, archived. The atlas has one job for you: fewer tabs, more moves.",
      "arc": "You arrived running simulations. You're leaving making moves on incomplete data — which, it turns out, is the only kind there is."
    },
    "pleaser": {
      "emoji": "🙏",
      "name": "The Pleaser",
      "tag": "Approval is a rented room",
      "desc": "You say sorry to furniture. Your default setting is whatever the room wants, and the room can tell. Somewhere under all that agreeableness is a person with actual preferences. The atlas would like to meet him.",
      "arc": "You arrived apologizing for existing. You're leaving saying true sentences at normal volume."
    },
    "grinder": {
      "emoji": "📈",
      "name": "The Grinder",
      "tag": "Optimizing everything but the point",
      "desc": "Five a.m. alarm, seven side hustles, zero dinners that weren't content. You turned self-improvement into one more boss to impress. The atlas won't tell you to slow down — just to pick a direction and let something compound. Including you.",
      "arc": "You arrived optimizing everything except the point. You're leaving playing one long game on purpose."
    },
    "ghost": {
      "emoji": "👻",
      "name": "The Ghost",
      "tag": "Potential energy, zero kinetic",
      "desc": "Left on read: the invites, the ideas, the version of you that does things. You're not shy exactly — you're pre-emptively absent, because absent can't fail. Bad news: it counts as failing. Good news: the fix is embarrassingly small.",
      "arc": "You arrived on read. You're leaving replying — in the chat, at the counter, out loud."
    }
  },
  "titles": [
    {
      "min": 90,
      "name": "FOLK HERO",
      "desc": "Ninety-plus percent of maximum aura. Aunties tell stories about you now. You held the frame in Mumbai, made the ask in New York, won the room in London, drew the line in Berlin, and passed it all on in Tokyo. The tour is over. The game, you may have noticed, was never the tour."
    },
    {
      "min": 75,
      "name": "MAIN CHARACTER",
      "desc": "Grounded, playful, direct. You didn't win every scene — main characters don't; that's what makes them watchable. You stayed yourself in five cities, which is the entire trick, and the aura followed the way it always does: sideways, while you were busy."
    },
    {
      "min": 55,
      "name": "RISING ARC",
      "desc": "Somewhere over the Atlantic, something shifted. You're mid-montage: the reps are compounding, the apologies are shrinking, the sentences are getting truer. Finish the montage. Run it back and watch the number move."
    },
    {
      "min": 35,
      "name": "SIDE CHARACTER",
      "desc": "Great lines, wrong show. You had main-character moments and then handed the mic back, as if holding it was a mistake. It wasn't. The aura is in there — it just asks permission too often. Run it back."
    },
    {
      "min": 0,
      "name": "CERTIFIED NPC",
      "desc": "You did the tour the way you were doing life: on autopilot, apologizing to doors, agreeing with rooms. Here's the thing though — an NPC who notices he's an NPC is already something else entirely. The dialogue tree just opened. Run it back."
    }
  ],
  "cities": [
    {
      "id": "mumbai",
      "name": "Mumbai",
      "flag": "🇮🇳",
      "tagline": "The Weight",
      "sub": "Money scripts & family gravity",
      "color": "#ff9933",
      "color2": "#ec4899",
      "intro": "Wedding season. Your mother booked your ticket before asking you, which is its own kind of love. Mumbai does not do subtle: fourteen million people, three hundred opinions about your life, most delivered before breakfast. Chapter one is about weight — the scripts about money and status you inherited before you could read. Time to check which ones are actually yours.",
      "clearPerfect": "A flawless run. Somewhere in Andheri, an aunty just felt a disturbance in the force and cannot explain it.",
      "clearGood": "You left lighter than you landed. The old scripts are still playing — but now you can hear them, which is the first step to not reading from them.",
      "clearRough": "The weight won some rounds. That's fine; you can't unlearn thirty years of programming in one wedding season. But you saw the code, and that can't be undone.",
      "scenarios": [
        {
          "title": "Log Kya Kahenge",
          "setup": "Your cousin's mehendi night, a rented Bandra terrace. Sharma Uncle — retired bank manager, self-appointed customs officer of the family — raises his voice over the dhol: \"Beta, thirty is coming. Still that computer job? Still on rent? Tell everyone.\" Twelve aunties rotate toward you like satellite dishes. Your mother goes very still at the samosa table. The dhol player, sensing content, softens.",
          "choices": [
            {
              "text": "Launch the full defense: salary trajectory, equity, why rent is actually smart, complete with percentages.",
              "aura": -450,
              "feedback": "You just filed an appeal in a court with no jurisdiction. The detailed defense tells everyone — mostly you — that Sharma Uncle's approval is a verdict you need. He'll forget this by dessert. You'll replay it in the shower for a week."
            },
            {
              "text": "Smile. \"Yes Uncle, still that job. I like it. How's the knee after Vaishno Devi?\"",
              "aura": 550,
              "feedback": "No defense, no counterattack, no seventeen-slide justification. You answered like a man whose life doesn't require a permit, then asked about his knee because you actually meant it. You declined the interrogation without declining the relationship — that's the whole trick, and the aunties noticed."
            },
            {
              "text": "Perform a strategic samosa retrieval and remain near the food table until the dhol restarts.",
              "aura": -50,
              "feedback": "The samosa retreat works exactly once, and everyone saw it. Avoidance keeps the surveillance state intact — you didn't dispute the court's authority, you just jumped bail. The question will be waiting at the next function, with interest."
            }
          ],
          "fieldNote": {
            "principle": "The Spotlight Effect",
            "source": "Thomas Gilovich, Cornell studies",
            "text": "Gilovich's experiments found people drastically overestimate how much others notice them — subjects wore an embarrassing t-shirt and guessed half the room clocked it; almost nobody had. \"Log kya kahenge\" runs on the same bug: the log are busy starring in their own dramas. Sharma Uncle's court convenes for four minutes. Only you can extend the session to a week."
          }
        },
        {
          "title": "The Rohan Update",
          "setup": "Stuck on the Sea Link in an Uber, you open LinkedIn. Cousin Rohan: \"Humbled to announce\" — Google, L5, Bay Area, two flag emojis. 847 reactions in an hour. The family WhatsApp and your group chat, Emotional Damage Pvt Ltd, are both detonating. Your chest does the thing. You haven't posted since 2023, and suddenly that feels like a medical result.",
          "choices": [
            {
              "text": "Draft your own announcement: inflate last quarter's work win into \"thrilled to share\", hashtag blessed.",
              "aura": -500,
              "feedback": "You tried to cure envy with the disease that caused it. Performing a win you don't feel widens the gap between your life and your feed. And Rohan will like the post within minutes, which will somehow make everything worse."
            },
            {
              "text": "Mute both chats, close the app, note that Rohan was always Mom's favorite anyway.",
              "aura": -100,
              "feedback": "Muting is hygiene; \"Mom's favorite\" is poison. You dodged the trigger but kept the story where his win is your loss. That's still his scoreboard. You just turned the display off without leaving the stadium."
            },
            {
              "text": "Call him, congratulate him properly. Then ask yourself what exactly stung — the job, or the certainty?",
              "aura": 600,
              "feedback": "The call costs nothing and buys back your dignity — envy you act on generously stops being shameful. And the question is the real move: envy is terrible fuel but decent data. It points at what you actually want. Usually it isn't his job. It's his finished-ness."
            }
          ],
          "fieldNote": {
            "principle": "Enough",
            "source": "Morgan Housel, The Psychology of Money",
            "text": "Housel: the hardest financial skill is getting the goalpost to stop moving. Comparison has no finish line, because someone always has more — Rohan is measuring himself against some guy at Google right now. \"Enough\" isn't surrender. It's knowing which game is yours, so another man's scoreboard stops running your nervous system."
          }
        },
        {
          "title": "Your Father's Voice",
          "setup": "A shoe shop off Linking Road. Three wedding events left, and your only formal pair has a sole held on by hope. The shoes that fit perfectly are ₹7,500. Instantly your father's voice loads in your head, fully rendered: \"Seven thousand? For SHOES?\" You earn in a month what he earned in a year at your age. Your hand hesitates anyway.",
          "choices": [
            {
              "text": "Buy the pair that fits. Notice, with some tenderness, whose voice you almost obeyed.",
              "aura": 550,
              "feedback": "That voice kept a family fed through decades when ₹7,500 was two months' rent. It was right then. You honored your father by noticing the script — and by seeing it's his software running on your hardware, solving a problem you no longer have. Money as options, not fear."
            },
            {
              "text": "Buy the ₹1,900 pair that pinches. Three sangeets of suffering is basically a saving.",
              "aura": -400,
              "feedback": "You saved ₹5,600 to spend three sangeets thinking about your feet. The script underneath: spending on yourself must be earned through suffering. That's not frugality — frugality is a strategy. This is a flinch wearing frugality's clothes, and it votes in every decision you make."
            },
            {
              "text": "Photograph both pairs, post to the group chat for a vote, exit the shop with nothing.",
              "aura": 50,
              "feedback": "You turned a shoe purchase into a referendum because wanting something felt like it needed witnesses. A committee can't tell you what you're allowed to want. Also, the group chat voted for the ugly pair and called you \"moneybags\". You knew they would."
            }
          ],
          "fieldNote": {
            "principle": "Invisible Money Scripts",
            "source": "Ramit Sethi, I Will Teach You to Be Rich",
            "text": "Sethi's invisible scripts: sentences installed in childhood — \"we can't afford it\", \"money doesn't grow on trees\" — that fire automatically decades later, whether or not they're still true. You can't delete a script. You can hear it, thank it for its service, and check it against your actual balance instead of your father's from 1994."
          }
        },
        {
          "title": "Javed Bhai's Opening Bid",
          "setup": "Chor Bazaar, Sunday morning. You find a brass nataraja your mother would love. \"Four thousand,\" says Javed bhai, with the serenity of a man opening negotiations, not closing them. You know it's worth maybe twenty-five hundred. Behind you, your NRI instinct whispers that haggling is embarrassing — something other people do. Javed bhai waits, entirely unembarrassed, entirely at peace.",
          "choices": [
            {
              "text": "Pay the full four thousand quickly, before anyone catches you doing mental math.",
              "aura": -450,
              "feedback": "You paid ₹1,500 extra to avoid thirty seconds of a conversation Javed bhai actively enjoys. The fear underneath: that talking about money makes you look small. It doesn't — flinching from it does. He had you read before your wallet cleared your pocket."
            },
            {
              "text": "Smile: \"It's beautiful. Two thousand?\" Then stand comfortably in the silence, ready to hear no.",
              "aura": 500,
              "feedback": "You said a number out loud without apologizing for it. That is the entire skill, and it transfers directly to every salary conversation you'll ever have. A counter-offer isn't an insult; it's participation. He respects you more at two thousand than he did at four."
            },
            {
              "text": "Open at eight hundred, cite \"market conditions\", execute two theatrical walkouts as planned.",
              "aura": 100,
              "feedback": "Credit for entering the arena, but you turned a chat into dinner theatre. Tactics are for people who think the other man is an obstacle. Javed bhai has watched ten thousand walkouts from that stool. He rated yours a six, mostly for footwork."
            }
          ],
          "fieldNote": {
            "principle": "The First Price Is a Question",
            "source": "Field research",
            "text": "Everywhere outside the mall, a price is an opening bid in a conversation both sides expect to have. Treating negotiation as shameful is a luxury belief — the merchant isn't offended by your counter; he's mildly offended you think he's fragile. A man who can name a number aloud, and survive a no, negotiates his whole life better."
          }
        },
        {
          "title": "The Poha Summit",
          "setup": "Breakfast at your masi's flat in Matunga. Your mother, casually, over poha: everyone has decided you'll stay three extra weeks for Chintu's tilak. Flights are \"changeable\". Your job, apparently, also changeable. Around the table, four faces already assuming yes. You have a project launch you actually care about, nine days from now. Your mouth opens before your plan does.",
          "choices": [
            {
              "text": "Say yes at the table. Quietly plan to \"discover\" a work emergency next Tuesday.",
              "aura": -500,
              "feedback": "A yes you don't mean is a lie with a delivery date. Next Tuesday's \"emergency\" requires acting talent you don't have, opposite a woman who invented that move before you were born. The fake-out doesn't protect her feelings. It protects you from one honest minute."
            },
            {
              "text": "Blame your manager, the deadline, HR policy — construct a no that's entirely someone else's fault.",
              "aura": 50,
              "feedback": "You said no while cosplaying a man with no choices. Borrowing your manager's authority works once — but it teaches the family your decisions are appealable, they just have to out-argue HR. Your no didn't need a permission slip. It needed your name on it."
            },
            {
              "text": "\"I love you all. I'll be at the wedding. The tilak I'll miss — my flight stands.\"",
              "aura": 600,
              "feedback": "Warm and immovable — the rarest combination in a family and the only one that works. You didn't argue the tilak's importance or defend your job. You stated what you're doing and stayed at the table, still loving them. Disappointment visited, then passed. Nothing burned down."
            }
          ],
          "fieldNote": {
            "principle": "Separation of Tasks",
            "source": "The Courage to Be Disliked (Kishimi & Koga)",
            "text": "Adler's separation of tasks: whether you stay is your task; how the family feels about it is theirs. You can be kind about their disappointment without being responsible for preventing it. Managing everyone's emotions through obedience isn't love — it's fear with good manners. Respect and obedience only look identical from a distance."
          }
        },
        {
          "title": "The ₹31,000 Question",
          "setup": "Nine old school friends, a loud seafood place in Khar. All evening you've been \"the dollar-salary guy\" — every anecdote priced in your imagined wealth. The bill lands: ₹31,000. A pause. Someone begins a slow-motion wallet reach. Nikhil grins: \"Arre, foreign returned, yaar.\" Eight faces, and somewhere in there yours too, waiting to see what your money is for.",
          "choices": [
            {
              "text": "Split it evenly, no speech. Later, quietly cover Arjun's share — he's between jobs.",
              "aura": 650,
              "feedback": "Splitting evenly declines the rich-cousin role they'd written for you. Covering Arjun quietly is the actual generosity: no audience, no announcement, no debt issued. Giving that nobody sees is the only kind without an invoice stapled to it. Nikhil can afford his own prawns."
            },
            {
              "text": "Grab it with a flourish: \"Arre, my treat, yaar!\" Wave off all nine protests.",
              "aura": -450,
              "feedback": "You bought nine seconds of being liked for ₹31,000, and approval purchased by wallet needs constant renewal payments. Underneath the flourish is the fear that without the money, you're not sure why they'd want you there. Sit with that. It isn't true, but it's steering."
            },
            {
              "text": "Convene the UPI tribunal: itemize the bill down to who ordered the extra squid.",
              "aura": 0,
              "feedback": "Precision down to the squid isn't fairness — it's fear of being taken advantage of, holding a calculator. You spent twenty minutes defending ₹340. Nobody will remember the split. Everyone will remember the audit, and quietly plan the next dinner without you."
            }
          ],
          "fieldNote": {
            "principle": "Give Without a Scoreboard",
            "source": "Adam Grant, Give and Take",
            "text": "Grant's research on givers: the ones who thrive give freely but deliberately — generous, not exploitable, and not performing. Picking up every bill isn't giving; it's purchasing a seat you already had at a table of people who liked you before the salary. The clean test: would you still do it if no one ever found out?"
          }
        },
        {
          "title": "The Aunty Gauntlet",
          "setup": "The engagement party, a Juhu banquet hall. You go for one plate of chaat and walk into a formation four decades in the making: five aunties, perfect semicircle, sequins glittering like riot gear. Kamla Aunty opens: \"Salary kitna, beta?\" Pushpa Aunty flanks: \"Marriage when? My friend's daughter Shruti — very homely, very MBA.\" A third, softly, merciless: \"Doctor banna tha, na?\" Exits: zero.",
          "choices": [
            {
              "text": "Answer everything precisely and apologetically, closing with \"next year pakka, Aunty\" about all of it.",
              "aura": -800,
              "feedback": "Full collapse. \"Next year pakka\" is a promissory note the network never forgets — Kamla Aunty has your quote on file, accruing interest, syncing across three continents by morning. Apologizing for your life confirmed the premise: that it was theirs to audit. You left that semicircle smaller than you entered it."
            },
            {
              "text": "Beam. \"Salary: enough. Marriage: whenever someone survives this family's interview round. Doctor? I faint at blood.\"",
              "aura": 1000,
              "feedback": "The whole game in one move: zero information surrendered, zero apology issued, five aunties laughing — Pushpa now likes you and can't remember why. They weren't gathering data; they were testing composure, and playfulness is composure with the safety off. Across the hall, your mother — still at the samosa table — exhales."
            },
            {
              "text": "Go cold: \"That's actually quite a personal question, Aunty.\" Watch the temperature drop eleven degrees.",
              "aura": -100,
              "feedback": "Frame held, room lost — technically correct, the worst kind of correct at an engagement party. Cold boundaries read as fear in formalwear. The aunties aren't enemies; they're a weather system. You don't file complaints against the monsoon. You dance in it, or you carry snacks."
            }
          ],
          "fieldNote": {
            "principle": "Answer the Real Question",
            "source": "Rory Sutherland, Alchemy",
            "text": "Sutherland's core idea: people run on psycho-logic, not logic. A defended fact invites cross-examination; a good joke is unanswerable. The aunties' literal questions are decoys — the real question is \"are you solid?\" Answer that one and the others evaporate. A man who won't accept the role of suspect cannot be interrogated, only enjoyed."
          }
        }
      ]
    },
    {
      "id": "newyork",
      "name": "New York",
      "flag": "🇺🇸",
      "tagline": "The Ask",
      "sub": "Ambition, rejection & asking out loud",
      "color": "#60a5fa",
      "color2": "#a78bfa",
      "intro": "A conference badge, a friend's couch in Queens, seven days. New York is a city-sized reminder that nobody is coming to discover you — everything you want here is downstream of an ask you haven't made yet. This chapter is about asking: for money, for chances, for attention. Out loud, in daylight, like it's normal. Because it is.",
      "clearPerfect": "You asked for everything and apologized for nothing. New York respects exactly one thing, and you did it all week.",
      "clearGood": "Some asks landed, some didn't. That ratio has a name: a career.",
      "clearRough": "You kept waiting to be picked. This city doesn't pick — it answers. Ask louder next time.",
      "scenarios": [
        {
          "title": "The Four Words",
          "setup": "Conference-eve mixer on a Chelsea rooftop. Your friend Arjun has abandoned you for the samosa sliders. A venture associate named Dana — firm handshake, terrifying eye contact — asks the four most feared words in Manhattan: \"So, what do you do?\" You do data engineering for a logistics company. At 6 a.m., before work, you build a cricket analytics app.",
          "choices": [
            {
              "text": "Deploy founder voice: \"I operate at the intersection of AI, sport, and story.\"",
              "aura": -450,
              "feedback": "Dana funds actual stealth startups; she clocked the fog in four seconds. Inflation isn't confidence — it's the fear that the true sentence is too small. It wasn't. Vagueness impresses nobody worth impressing, and now the real thing sounds like a cover story."
            },
            {
              "text": "\"I build data pipelines for a logistics company. On the side, a cricket analytics app.\"",
              "aura": 550,
              "feedback": "Two plain sentences, no apology, no garnish. Dana asks a follow-up about cricket data, because specificity gives people a handle to grab. You didn't perform status; you transmitted information and let it be interesting on its own. That's what confidence sounds like at normal volume."
            },
            {
              "text": "\"Oh, nothing interesting, just boring data stuff.\" Laugh. Deflect. Ask about her job for twenty minutes.",
              "aura": -100,
              "feedback": "Self-deprecation feels like humility, but it's a preemptive strike: reject yourself before anyone else can. You made Dana do the labor of finding you interesting, then withheld the material. Twenty minutes of asking about her job isn't politeness — it's hiding with good manners."
            }
          ],
          "fieldNote": {
            "principle": "Obvious to you, amazing to others",
            "source": "Derek Sivers",
            "text": "Sivers' observation: what feels obvious and boring to you often sounds remarkable to everyone else — you're just numb to it from proximity. \"A cricket analytics app before work\" is a genuinely interesting sentence; only you find it small. Say the plain thing and let other people have their reaction. Inflating it just proves you never noticed what you had."
          }
        },
        {
          "title": "The Coffee Urn",
          "setup": "Sponsor hall, day one. Everyone is lanyard-scanning everyone like speed dating with QR codes. By the coffee urn, a founder named Tobias is quietly melting down: his demo laptop won't talk to the projector and his stage slot is in forty minutes. You've fixed this exact display-driver nightmare twice. You also have a pitch you rehearsed on the flight over.",
          "choices": [
            {
              "text": "Work the hall. Forty handshakes, forty pitches, a pocket full of business cards by lunch.",
              "aura": -100,
              "feedback": "Forty contacts, zero impressions. Everyone in that hall was broadcasting; nobody was receiving, and your pitch blurred into the wallpaper of pitches. A stack of cards isn't a network — it's confetti. You optimized for feeling productive, which is the networking version of empty calories."
            },
            {
              "text": "Fix his laptop, then pitch him immediately while the gratitude is still warm. Card in hand.",
              "aura": -400,
              "feedback": "Help with an invoice stapled to it isn't generosity; it's a transaction he never agreed to. Tobias felt the switch flip — gratitude curdles fast when it's harvested on the spot. Underneath is the fear that an uncashed favor evaporates. Givers who keep score are just takers with patience."
            },
            {
              "text": "Fix the laptop. Ask about his product because it's interesting. Leave your pitch in your bag.",
              "aura": 600,
              "feedback": "His demo runs clean, and at dinner he tells the story with your name in it. You led with usefulness and let the relationship set its own terms — which reads as abundance because it is. People remember who showed up before there was anything in it for them."
            }
          ],
          "fieldNote": {
            "principle": "Givers finish first",
            "source": "Adam Grant, Give and Take",
            "text": "Grant's research found givers at both ends of the success curve — burned-out doormats at the bottom, and at the very top, people who help genuinely without keeping a ledger. The difference: top givers help where it costs them little and matters a lot, and let relationships mature on their own clock. Favors with invoices don't count."
          }
        },
        {
          "title": "Two-Line Tuesday",
          "setup": "Lunch break, Koreatown, tteokbokki. Your phone buzzes: the sports-data company you cold-emailed — the email you drafted eleven times — has replied. Two lines. \"Not a fit right now. Best of luck.\" Thirty seconds later your mother calls, unrelated, to ask if you're eating properly. You are, technically. The group chat, \"Log Kya Kahenge,\" awaits your report.",
          "choices": [
            {
              "text": "Reply with thanks, ask one specific question about the gap, send two new cold emails tonight.",
              "aura": 550,
              "feedback": "Caring about the work and detaching from the verdict can coexist — the ask was the win; the answer is data. Your one polite question sometimes returns a real reason, which is free coaching. And two more emails tonight turns a sting into throughput. Rejection at volume is called a pipeline."
            },
            {
              "text": "Reread your original email hunting for the fatal sentence. Draft a defense you will never send.",
              "aura": -50,
              "feedback": "You can't autopsy a single data point into a lesson; you're just re-tasting the sting. That unsent defense is your ego litigating a case nobody filed. Eleven drafts was the real tell: one perfect shot, fully loaded. Perfectionism is how you end up sending one email a year."
            },
            {
              "text": "Tell Log Kya Kahenge the market is rigged, nepotism won, and you're becoming a monk. Attach screenshot.",
              "aura": -500,
              "feedback": "\"It's all nepotism\" is anesthetic — it numbs by declaring effort pointless, which conveniently excuses you from asking again. The chat will supply the agreement you're fishing for, and everyone stays exactly where they are. Bitterness is fear wearing an analyst's badge, and it compounds too."
            }
          ],
          "fieldNote": {
            "principle": "Make more pots",
            "source": "David Bayles & Ted Orland, Art & Fear",
            "text": "The ceramics-class story: students graded on sheer quantity produced better pots than students graded on one perfect pot, because reps teach what theorizing can't. Your eleventh draft of one email taught you less than eleven emails would have. Asks are pots. Volume plus iteration beats the flawless single shot, every time."
          }
        },
        {
          "title": "The Exposure Package",
          "setup": "Day two. A founder named Mireille corners you after your lightning talk — she loved your dashboard work and wants one for her startup. \"Budget's tight. Five hundred bucks, plus great exposure?\" That's a full week of your evenings. Something in you, trained over decades to be agreeable, is already nodding on your behalf.",
          "choices": [
            {
              "text": "\"Totally, five hundred works! Honestly I'd have done it for free.\" Keep nodding. Cannot stop nodding.",
              "aura": -450,
              "feedback": "You sweetened your own lowball before she even pushed — people-pleasing arithmetic, her comfort priced above your week. By Thursday you'll resent the project, and resentment leaks into work. Cheap didn't make her like you; it made her quietly wonder what's wrong with the product."
            },
            {
              "text": "\"Let me think about it,\" then email tonight offering an unprompted forty percent discount.",
              "aura": 0,
              "feedback": "You negotiated against yourself in an empty room. An unprompted forty-percent discount announces that your own number frightened you. At least you emailed. But Mireille is a founder — she hears prices all day without dying, and now she knows yours bends before anyone leans on it."
            },
            {
              "text": "\"My rate for this is three thousand. Happy to trim scope to fit your budget.\"",
              "aura": 650,
              "feedback": "Mireille doesn't flinch; she recalibrates. A three-thousand-dollar dashboard must simply be better than a five-hundred-dollar one — the number itself did the marketing. And flexing scope instead of rate keeps your price meaning something. You can always add generosity later. You can never un-cheapen yourself."
            }
          ],
          "fieldNote": {
            "principle": "Price is information",
            "source": "Rory Sutherland, Alchemy",
            "text": "Sutherland on pricing: the number isn't just what you charge, it's a story about what the thing is. Expensive painkillers outperform identical cheap ones — the price itself does psychological work. Cheap doesn't signal generous; it signals doubtful. Charge as though you believe yourself, and clients are given permission to believe you too."
          }
        },
        {
          "title": "Kelvin's Slot Machine",
          "setup": "Midnight dosa run, Jackson Heights, with Arjun's roommate Kelvin, who is up forty grand this quarter selling AI voice agents to dentists. \"Cricket analytics? Bro. Pivot. The window is now.\" Your app has 1,100 users, grows four percent a week, and earned sixty-one dollars last month. Kelvin's phone glows between you like a slot machine.",
          "choices": [
            {
              "text": "Ask Kelvin sharp questions, steal one distribution trick, go home, ship Tuesday's cricket update anyway.",
              "aura": 500,
              "feedback": "You mined the gold rush for a shovel and kept your claim. Four percent weekly compounds to roughly eightfold in a year — boring right up until it's shocking. Kelvin's window will close; yours is a door you own. Curiosity without abandonment is the entire skill."
            },
            {
              "text": "Split your evenings: cricket app Monday through Wednesday, dentist agents Thursday through Sunday. Two rockets.",
              "aura": 0,
              "feedback": "Half-effort in two directions rounds to zero in both. Compounding punishes interruption more than it punishes slowness — the app doesn't need brilliance, it needs Tuesdays. This isn't diversification; it's hedging against the discomfort of commitment, and both projects will feel your absence."
            },
            {
              "text": "Text Log Kya Kahenge \"going all-in on dentist AI.\" Archive the cricket repo at 2 a.m.",
              "aura": -550,
              "feedback": "Every quarter mints a new Kelvin, and chasing his trade means arriving after the move, forever. You'd liquidate two years of specific knowledge to join a crowd at zero. The itch isn't strategy — it's the fear that patience looks identical to losing. It doesn't. Check your own graph."
            }
          ],
          "fieldNote": {
            "principle": "One game, played long",
            "source": "Naval Ravikant",
            "text": "Naval's argument, paraphrased: nearly all returns in life come from compound interest in long games — and every time you switch games, the compounding resets to zero. Specific knowledge is earned by staying interested past the point where everyone else got bored. People who look suddenly lucky mostly just refused to change direction."
          }
        },
        {
          "title": "Sana Gets Her Coat",
          "setup": "Arjun's rooftop in Astoria, string lights, one Arijit Singh song too many. You've spent forty minutes with Sana — structural engineer, rates New York bridges out of ten, calls the Manhattan Bridge \"a solid seven with commitment issues.\" She laughs at your worst joke and dismantles your best argument. Somewhere in Edison, the aunty network already knows her name. She's finding her coat.",
          "choices": [
            {
              "text": "Let her leave. Follow her on Instagram tonight. Like one story every three business days.",
              "aura": -500,
              "feedback": "Four months of ambient surveillance is not romance; it's risk management — all of the longing, none of the exposure. Orbiting feels safe because nobody can reject you, but it also means she can never actually choose you. Permanent maybe isn't hope. It's hiding with wifi."
            },
            {
              "text": "\"I've really enjoyed talking to you. Can I take you to dinner on Thursday?\"",
              "aura": 600,
              "feedback": "One sentence, real stakes, and full freedom to decline — which is exactly what makes a yes mean something. She checks her calendar. Thursday works. Directness lands because it's honest, not because it's a move: you wanted something and said so, without needing a particular answer to survive."
            },
            {
              "text": "Deploy the highlight reel — the startup, the half-marathon, the Virat Kohli near-encounter. Make her stay.",
              "aura": -100,
              "feedback": "The highlight reel is fear in a party shirt: maybe if she sees credentials, she won't look too closely at you. But she stayed forty minutes for the unlisted version. Performing at the exit converts a real connection into an audition nobody scheduled. She liked the guy before the reel."
            }
          ],
          "fieldNote": {
            "principle": "Neediness is the killer",
            "source": "Mark Manson, Models",
            "text": "Manson's core claim: attraction isn't killed by wrong words, it's killed by neediness — prioritizing her opinion of you over your own. The honest invitation inverts that: you state what you want, she's completely free to decline, and nobody performs. A no becomes information between two adults instead of a verdict on your worth."
          }
        },
        {
          "title": "The Freight Elevator",
          "setup": "Final day. The venue's main elevators are down, and security waves you into the freight elevator with exactly one other person: Priya Rao, founder of Trackline — the sports-data company whose two-line rejection is still open in your inbox. She looks fried, balancing a coffee and a phone on four percent battery. Eleven floors. The doors close.",
          "choices": [
            {
              "text": "Deliver the pitch you rehearsed on the flight. All of it. Before floor nine.",
              "aura": -700,
              "feedback": "You turned eleven floors into a hostage situation. A captive audience is not an interested one — Priya's been pitched forty times today, and a monologue says \"you are a resource,\" not \"you are a person.\" \"Send me a deck\" is founder for goodbye. Boldness in service of extraction reads as need."
            },
            {
              "text": "Say nothing. Breathe freight-elevator air together. Send a LinkedIn request from the lobby, with note.",
              "aura": 100,
              "feedback": "A respectable retreat — you burned nothing, and the note was polite. But she rides freight elevators precisely because the lobby is full of LinkedIn requests. You were handed proximity money can't buy and converted it into the identical ask of everyone who wasn't in the elevator."
            },
            {
              "text": "\"Long conference?\" Talk like a person. Near floor two: \"Could I email you one screenshot for brutal feedback?\"",
              "aura": 1000,
              "feedback": "She laughs — the first unscripted question anyone's asked her all day. Two floors of actual conversation, then an ask so small it's easy to grant and so specific it proves you're serious: ninety seconds of her judgment, not her calendar. And you never once mentioned the rejection. She says send it."
            }
          ],
          "fieldNote": {
            "principle": "Shrink the ask",
            "source": "Field research",
            "text": "Nobody's trajectory was ever changed by a monologue. The person who could change yours is drowning in big vague asks — \"pick your brain,\" \"grab coffee sometime\" — so a small, specific, easy-to-grant request stands out like a lit window. Be a person first, then make the ask the size of a favor between equals. Big doors swing on small hinges."
          }
        }
      ]
    },
    {
      "id": "london",
      "name": "London",
      "flag": "🇬🇧",
      "tagline": "The Wink",
      "sub": "Wit, play & the art of the reframe",
      "color": "#34d399",
      "color2": "#fbbf24",
      "intro": "London runs on an economy of wit. Nobody says what they mean; everybody means what they joke. Your university friend has a sofa in Peckham and a calendar that is entirely pubs. This chapter is about lightness — banter, reframes, and why the person having the most fun usually wins the room without trying to.",
      "clearPerfect": "You gave as good as you got and made three strangers funnier. That is the entire sport, and you just won the season.",
      "clearGood": "You let a few volleys sail past, but you stayed on the court. Playfulness is a muscle. It's warming up.",
      "clearRough": "You did the maths on every joke and got the right answer just after everyone had moved on. Lightness can't be calculated. Come back and lose gracefully.",
      "scenarios": [
        {
          "title": "The Piss-Take",
          "setup": "Friday night, the Prince of Peckham. Arjun's mates — Callum, big Tom, Meera from his five-a-side — are volleying insults at a speed you didn't train for. Then Callum clocks you: \"Your mate's been nursing that Guinness like it owes him money.\" The table turns. No backup: the group chat, \"Log Kya Kahenge,\" is asleep across three time zones.",
          "choices": [
            {
              "text": "Smile, say nothing, and privately run the numbers on whether Callum actually meant something.",
              "aura": -100,
              "feedback": "You treated banter like an exam with trick questions. Nobody was testing you — they were inviting you in. Silence at this table doesn't read as shy; it reads as judging. They didn't need you to be funny. They needed you visibly unbothered and present."
            },
            {
              "text": "\"First Guinness ever, actually. I'm meeting the family before I commit to anything.\"",
              "aura": 500,
              "feedback": "You punched at the situation and sideways at yourself — the only two safe targets. Committing to the bit tells the table nothing about you is fragile, which is what piss-taking checks for: it's a trust test wearing an insult's clothes. You're in. Big Tom buys the next round."
            },
            {
              "text": "Go at Meera instead: \"At least I don't dress like a geography teacher.\"",
              "aura": -550,
              "feedback": "That's a neg in banter's clothing, aimed at the one person who hadn't touched you. Everyone clocked it in half a second. The fear underneath: if I'm not attacking, I'm the target. Real banter lifts the whole table. Yours split it into sides, with you alone on one."
            }
          ],
          "fieldNote": {
            "principle": "The Trust Test",
            "source": "Field research",
            "text": "British piss-taking is a handshake, not a duel. The insult is fake; the invitation underneath is real. You pass by showing a joke can land on you without anything breaking. You fail two ways: going silent, which says fragile, or drawing actual blood, which says dangerous. The winning move is warmth at speed."
          }
        },
        {
          "title": "Dal on Tap",
          "setup": "Saturday, Frank's Cafe rooftop, sunset doing its best work over the Peckham multi-storey. Someone new — Femi, an architect, easy to talk to — asks where you live back home. The honest answer: with your parents, at twenty-eight, banking most of your salary. You feel the old flinch arriving right on schedule.",
          "choices": [
            {
              "text": "\"Oh, I've got a place sorted, yeah.\" Vague hand movement. Ask her about architecture, fast.",
              "aura": -450,
              "feedback": "You laundered a true thing because you'd already convicted yourself of it. But the dodge costs more than the fact ever would: now there's a soft spot in your story you'll spend all night guarding. You cannot be relaxed and hiding at the same time."
            },
            {
              "text": "\"With my parents — I know, I know, it's an Indian thing. I'm working on it, promise.\"",
              "aura": -100,
              "feedback": "You told the truth, then apologised for it — which instructs everyone exactly how to feel about it. \"I know, I know\" is you negotiating against yourself before anyone's made an offer. The fact was never the problem. The flinch you stapled to it was."
            },
            {
              "text": "\"HQ is my parents' place. Rent-free, dal on tap, sixty percent savings rate. It's a strategy.\"",
              "aura": 600,
              "feedback": "Same facts, new frame, zero lies. You presented the arrangement as a decision instead of a confession, and people adopt whichever frame is offered most confidently. Femi spent the next ten minutes asking about your five-year plan. Nobody pities a man with a strategy."
            }
          ],
          "fieldNote": {
            "principle": "Change the Frame",
            "source": "Rory Sutherland, Alchemy",
            "text": "Sutherland's whole trade: value lives in the frame, not the facts. The same flat is cramped or cosy; the same commute is dead time or reading time. Most problems, he argues, aren't solved with logic — they're solved by changing what the thing means. You didn't lie to Femi. You just stopped narrating your life as its prosecutor."
          }
        },
        {
          "title": "The £43 Startup",
          "setup": "Sunday roast upstairs at the Montpelier. Arjun, glowing with love and gravy, tells the table about your final-year startup — the one with £43 of lifetime revenue that ate your whole summer. Everyone is laughing, warmly, at you. You feel the fork in the road: ride the laugh, or grab a shovel.",
          "choices": [
            {
              "text": "\"£43. My investors — my mum — have never let me forget it.\" Then let the table move on.",
              "aura": 450,
              "feedback": "One clean joke, thrown with a straight arm — then you stopped, which is the hard part. Letting the laugh land without chasing it is what being at peace with a story sounds like. You laughed at a thing you did, not at what you are. The table heard the difference."
            },
            {
              "text": "\"Classic me. I ruin everything I touch. Ask anyone. It's genuinely embarrassing being me.\"",
              "aura": -500,
              "feedback": "That's not humour, it's fishing — three self-attacks cast out hoping someone shouts \"no, you're great.\" The table hears the request underneath the joke and now has a job: managing your feelings. You turned your own punchline into their labour."
            },
            {
              "text": "Set the record straight: \"The unit economics were sound; the market timing was off.\"",
              "aura": -50,
              "feedback": "You defended a £43 startup like it was on trial. Correcting a friendly laugh tells everyone the wound is still open. Nobody at that table was auditing your unit economics; they were enjoying you. You chose being technically right over being in the room."
            }
          ],
          "fieldNote": {
            "principle": "Laughing or Fishing",
            "source": "Mark Manson, Models",
            "text": "Manson's core diagnosis: neediness kills everything, and it leaks through any disguise. Self-deprecation is confidence when it asks for nothing back, and neediness when it's a reassurance request in a joke costume. Same words, opposite signal. One test — after the laugh, can you let it go? If you keep digging, you're fishing."
          }
        },
        {
          "title": "The Lisbon Take",
          "setup": "Tuesday, dinner at Arjun's flat, six people around a table built for four. Tom, deep into the Malbec, announces with total certainty that \"no creative person can live in London anymore — everyone real has moved to Lisbon.\" You think this is about eighty percent nonsense. Tom scans the table for agreement.",
          "choices": [
            {
              "text": "Nod. \"Yeah, no, fair.\" You disagree with all of it, but dinner is going so nicely.",
              "aura": -100,
              "feedback": "You swallowed a real disagreement to buy fake peace, and that trade always clears at a loss. Tom learns nothing, you feel slightly smaller, and your agreement quietly devalues as a currency — because everyone can see you spend it on everything."
            },
            {
              "text": "Deploy the counter-case: Lisbon rents, three statistics, a timeline correction. Win the point thoroughly.",
              "aura": -400,
              "feedback": "You brought a spreadsheet to a vibes fight. The table watched you convert a fun dinner into a deposition and quietly sided with Tom, who was at least enjoyable. The need underneath — to be seen being right — is how you win the point and lose the room."
            },
            {
              "text": "Grin: \"Big claim from a man currently living in London. Go on then — convince me.\"",
              "aura": 550,
              "feedback": "You named the contradiction, handed him the floor, and kept the whole thing a game. A grin plus a real challenge says: I take your idea seriously and you lightly. Tom argued back delightedly for ten minutes. Nobody's status was ever in danger."
            }
          ],
          "fieldNote": {
            "principle": "Strong Opinions, Light Grip",
            "source": "Adam Grant, Think Again",
            "text": "Grant's research on changing minds: prosecutors harden people, curious people open them. Attack a belief and its owner defends it like property; ask him to walk you through it and he audits it himself. Hold your view firmly enough to state it and lightly enough to play with it. Certainty is heavy. Curiosity is the flex."
          }
        },
        {
          "title": "The Obituarist",
          "setup": "Thursday afternoon, Review bookshop on Bellenden Road. You and a woman reach for the same Rory Sutherland paperback. \"I saw it first,\" she says, \"but have it — you look like you need it more.\" Her name is Ana. She writes obituaries for a broadsheet, and she is visibly enjoying herself.",
          "choices": [
            {
              "text": "\"Bold — an obituary writer deciding what I need.\" Hand her the book. Let the pause sit.",
              "aura": 600,
              "feedback": "You returned serve, gave up the book without ceremony, and — hardest of all — let the silence breathe. A held pause says you're enjoying this, not auditioning for it. She names a coffee place two streets over. Even if she hadn't, the rally was already the point."
            },
            {
              "text": "Play it safe: ask what she does, where she's from, how long she's been in London.",
              "aura": -100,
              "feedback": "She served you a game and you handed back a customs form. Interviewing feels safe because questions can't be rejected — but it converts play into an intake process. She offered a rally; the only currency that counted here was hitting the ball back."
            },
            {
              "text": "Launch a five-minute bit about drafting your own obituary. Keep going when she tries to speak.",
              "aura": -450,
              "feedback": "The bit started well and became a hostage situation. Performing is a monologue; flirting is a rally, and the whole pleasure is the return shot — which you kept taking for yourself. Underneath the material: the fear that if you stop entertaining, you stop existing to her."
            }
          ],
          "fieldNote": {
            "principle": "Play, Not Pitch",
            "source": "Esther Perel, Mating in Captivity",
            "text": "Perel's observation: desire runs on playfulness, curiosity and a little space — never on auditions. Flirtation isn't a pitch meeting you're trying to close; it's a game two people agree to enjoy for its own sake. The moment you need it to go somewhere, the play collapses into pressure, and both of you feel the drop."
          }
        },
        {
          "title": "Lamb Chop Economics",
          "setup": "Your last full day. Arjun has housed you, fed you, lent you an umbrella and, at one low point, a sock. You want to thank him properly. Assets: £70, a phone, and one overheard detail — that nobody on earth makes lamb chops like his mum back in Nairobi.",
          "choices": [
            {
              "text": "Buy the most expensive whisky on Bellenden Road. Hand it over: \"Cheers for everything, mate.\"",
              "aura": 100,
              "feedback": "Perfectly nice, instantly forgettable. Money without thought signals exactly what it is: you solved him with your wallet in four minutes. It says thank you. It doesn't say I noticed you — and noticing was the entire assignment."
            },
            {
              "text": "Get his mum's number off the aunty network, take the recipe, spend all afternoon cooking it.",
              "aura": 700,
              "feedback": "The chops were a six out of ten and it didn't matter. Arjun went quiet, laughed for a full minute, then rang his mum. The gift wasn't dinner — it was proof you caught a Tuesday detail and spent a whole afternoon on him. Unfakeable effort is the message."
            },
            {
              "text": "Text \"I owe you one x\" from the Gatwick train tomorrow, and genuinely mean it.",
              "aura": -400,
              "feedback": "You do mean it, and he will never feel it. \"I owe you one\" is the thoughts-and-prayers of friendship: zero cost, therefore zero signal. The small fear underneath — that a proper gesture might look earnest — just priced a week of his generosity at one text."
            }
          ],
          "fieldNote": {
            "principle": "Waste Is the Message",
            "source": "Rory Sutherland, Alchemy",
            "text": "Sutherland on signalling: flowers work precisely because they're expensive and then they die — the inefficiency is the information. A gesture is credible in proportion to what it visibly cost you: time, attention, specificity. One remembered detail beats any gift card. Efficient gratitude is a contradiction; the waste is what makes it mean anything."
          }
        },
        {
          "title": "The Dinner Party",
          "setup": "Final night. Arjun's girlfriend Yemi hosts dinner in Clapton — ten people, none of whom you know, including a barrister, a DJ, and a man called Hugo who is already holding court. Early on, a woman named Priti mentions, almost apologetically, that she once cycled Cairo to Cape Town. The table sails past it. You didn't.",
          "choices": [
            {
              "text": "Wait for a gap, then deploy the Goa wedding story. It has killed at three dinners.",
              "aura": -800,
              "feedback": "The story is genuinely good, and ten strangers could still smell the rehearsal. You held the floor for six minutes and made zero allies — a performance for an audience that owed you nothing. Dominating a room isn't status; it's an application for status, submitted in triplicate."
            },
            {
              "text": "Stay useful and invisible: refill glasses, clear plates, laugh at Hugo. Risk absolutely nothing.",
              "aura": 100,
              "feedback": "You were lovely, and you were furniture. Service is generosity's decoy: it can never be rejected, because you never actually arrive. Yemi will tell Arjun you were sweet. Nobody will remember a single thing you said — because you engineered the evening so there was nothing to remember."
            },
            {
              "text": "At the next lull: \"Sorry — Priti. Cairo to Cape Town? On a bicycle? Start at Cairo.\"",
              "aura": 1000,
              "feedback": "You handed the floor away and somehow ended up owning the room. Priti lit up for twenty minutes; the table remembers her story and your name, in that order. When your callback lands at dessert — \"well, it's hardly the Sudan border\" — it's an inside joke you built ten people into. Hosts make stars."
            }
          ],
          "fieldNote": {
            "principle": "Be the Host Anyway",
            "source": "Priya Parker, The Art of Gathering",
            "text": "Parker's rule: the best guests act like co-hosts — their job is everyone else's experience, not their own airtime. Spot the buried story, ask the question the table secretly wanted asked, connect the shy to the loud. Nobody remembers who talked the most. Everyone remembers who made the room feel good — and that job is always vacant."
          }
        }
      ]
    },
    {
      "id": "berlin",
      "name": "Berlin",
      "flag": "🇩🇪",
      "tagline": "The Line",
      "sub": "Boundaries & saying the true thing",
      "color": "#a3e635",
      "color2": "#f472b6",
      "intro": "A month in a Kreuzberg flatshare with a techno DJ and a woman who labels her shelf of the fridge. Berlin will not read your subtext. It does not do hints; it does sentences. This chapter is about the line — where you end, where other people begin, and how to say the true thing kindly. Today, ideally.",
      "clearPerfect": "Not one hint, not one essay, not one resentful yes. The flat would tell you they're impressed — in fact they already did, to your face, in sentences.",
      "clearGood": "You said some true things at normal volume. A few came out sideways. That's what practice sounds like.",
      "clearRough": "Too many yeses that meant no. Berlin doesn't punish honesty — it punishes the wait. The line is still there for the drawing.",
      "scenarios": [
        {
          "title": "The No",
          "setup": "Your college friend Arjun texts from London: he's coming for a festival and wants your couch for ten days. Your flatshare has a guest policy, thin walls, and a Birgit — she once reported a tote bag as 'possibly subletting'. You don't want this. You've known since the word 'ten'. The typing indicator blinks, patient as a debt collector.",
          "choices": [
            {
              "text": "Draft three paragraphs: a fake landlord inspection, a vague illness, two apologies and one 'next time pakka.'",
              "aura": -100,
              "feedback": "You got to no, but you paid for it in fiction. The essay isn't for Arjun — it's a plea bargain with your own guilt. Every fake reason is a door he can argue with. A clean no has no handles."
            },
            {
              "text": "'Can't host you this trip, yaar. But block Saturday — dinner's on me.'",
              "aura": 550,
              "feedback": "One sentence, no essay, plus a real alternative. You said what's true, kept the friendship warm, and didn't outsource the decision to his reaction. Notice nothing exploded. Disappointment survived contact with daylight. It usually does."
            },
            {
              "text": "Type 'of course bro!!' and begin resenting him quietly, in advance, for the full ten days.",
              "aura": -500,
              "feedback": "You bought ten days of peace with ten days of resentment — terrible exchange rate. The yes wasn't generosity; it was fear of being seen as ungenerous. Arjun would rather have a no than a host who flinches when he laughs."
            }
          ],
          "fieldNote": {
            "principle": "Hell yeah or no",
            "source": "Derek Sivers, Hell Yeah or No",
            "text": "Sivers' filter: if you can't say an enthusiastic yes, say no — a lukewarm yes silently spends the time and goodwill your real yeses need. The couch isn't the point. Ten days of pretending is. A fast, kind no is a gift to both of you; a slow, resentful yes robs you both."
          }
        },
        {
          "title": "Say the Thing",
          "setup": "Franzi runs the Sunday record stall at Nowkölln flea market — PhD in urban acoustics, laughs with her whole torso, once sold you a warped Asha Bhosle LP at a 'structural damage discount'. You've helped her pack crates three Sundays running. Today she says, 'You're here a lot.' It is not an accusation. It is a door.",
          "choices": [
            {
              "text": "'Because I like you. Can I take you to dinner — a date, to be clear?'",
              "aura": 600,
              "feedback": "Unhurried, unambiguous, easy to answer either way. You handed her real information and kept your dignity regardless of the reply. Whatever she says, you've already won the only thing you controlled: being a man who says what he wants."
            },
            {
              "text": "Organize a group picnic at Tempelhof and engineer the seating so you land beside her.",
              "aura": -100,
              "feedback": "The picnic is a plausible-deniability machine: if nothing happens, you never risked anything. But she can feel the engineering — everyone can. Ambiguity isn't smooth; it's fear wearing a strategy costume, and it quietly reads as untrustworthy."
            },
            {
              "text": "Laugh it off, offer to build her stall a free website, keep showing up as staff.",
              "aura": -550,
              "feedback": "You just applied for a job she never posted. The helper role feels safe because it can't be rejected — but it also can't be chosen. Hiding your intent isn't kindness to her; it's insurance for you, paid in Sundays."
            }
          ],
          "fieldNote": {
            "principle": "The zone is self-built",
            "source": "Mark Manson, Models",
            "text": "Manson's argument: the friend-zone isn't something women do to men; it's what a man builds by hiding what he wants while pretending he wants nothing. Stating desire plainly is respectful precisely because it gives her a real choice. The risk was never the honesty — it's the years of ambiguity."
          }
        },
        {
          "title": "The Matthias Review",
          "setup": "Your contract gig near Moritzplatz. Matthias — senior engineer, bikes in all weathers, owns one facial expression — reviews your week's work quietly, just the two of you: 'The idea is good. The structure is confused, and you repeat yourself when unsure. Rework it.' He says it like a weather report. Your ears go hot. He is, annoyingly, correct.",
          "choices": [
            {
              "text": "Defend every choice line by line, then note that his English 'can come across harsh'.",
              "aura": -100,
              "feedback": "You heard a verdict on your soul, so you lawyered up. But he critiqued a document, not a person. Deflecting to his tone is the tell: you're negotiating your worth when the only thing on the table was structure."
            },
            {
              "text": "Apologize three times, rewrite even the good parts overnight, tell Emotional Damage Pvt. Ltd. you're finished.",
              "aura": -550,
              "feedback": "This is collapse cosplaying as diligence. Overcorrecting everything, including what worked, tells your nervous system the criticism was total — it wasn't. Matthias spent thirty seconds on this. You're spending a night. The maths of shame never balances."
            },
            {
              "text": "'Which sections read most confused to you?' Take notes. Say thanks. Rework it tomorrow, rested.",
              "aura": 500,
              "feedback": "You converted sting into specification. Asking 'which sections' does two things: gets you usable data and proves to yourself the feedback is about the work. German directness is a gift economy — he paid you the compliment of precision."
            }
          ],
          "fieldNote": {
            "principle": "Verdict or information",
            "source": "Carol Dweck, Mindset",
            "text": "Dweck found people hear criticism through one of two filters. The fixed mindset asks 'what does this say about me?' and must defend or collapse. The growth mindset asks 'what can I use?' Matthias handed you a map of your blind spots for free. Only one filter can accept the gift."
          }
        },
        {
          "title": "The Reliable One",
          "setup": "Sprint planning over flat Club-Mate. Sandra, your project lead, smiles: 'We thought you could also own the analytics dashboard — you're so reliable.' It's the third 'also' this month. Your weekend, already thin, flickers like a dying U-Bahn light. Around the table, the people who said no early are sipping peacefully.",
          "choices": [
            {
              "text": "'Happy to — if we move the reporting deadline or drop the migration. Which matters more?'",
              "aura": 600,
              "feedback": "You said yes to the work and no to the fantasy that capacity is infinite. Renegotiating out loud reframes you from resource to decision-maker. Notice Sandra didn't flinch — trade-offs are her native language. Compliance gets used; judgment gets consulted."
            },
            {
              "text": "'Of course!' Cancel Saturday. Add it to the invisible ledger no one knows they're in.",
              "aura": -550,
              "feedback": "Reliable is what people call a vending machine. The yes felt generous, but the ledger you're keeping will get paid in resentment, and nobody agreed to those terms. You're training the room that your time is the cheapest line item."
            },
            {
              "text": "'I'll see,' then screenshot it to Emotional Damage Pvt. Ltd. with a knife emoji.",
              "aura": -100,
              "feedback": "The knife emoji got twelve laughs and changed nothing. Venting is a pressure valve that lets you keep tolerating the problem. The people you're afraid to negotiate with respect negotiation; the audience you performed for can't grant it."
            }
          ],
          "fieldNote": {
            "principle": "Otherish, not selfless",
            "source": "Adam Grant, Give and Take",
            "text": "Grant studied givers at work: they land at both the bottom and the top. The difference isn't generosity, it's terms — failed givers say yes to everything and burn out; successful ones give real value while protecting their capacity out loud. A yes with conditions isn't selfish. It's the only yes that's sustainable."
          }
        },
        {
          "title": "Heute Nicht",
          "setup": "Saturday, 1 a.m. The Berghain queue has the silence of a job interview. You've worn your most affectless black and rehearsed unsmiling. The bouncer — beard, tattoos, eyes that have witnessed a decade of hope — looks at your group for two seconds. 'Heute nicht.' Not today. Your flatmates are already turning. Jonas shrugs, unbothered, native.",
          "choices": [
            {
              "text": "Explain you flew six thousand kilometres and this DJ's set is 'genuinely formative' for you.",
              "aura": -450,
              "feedback": "The door has heard every essay. Pleading converts a neutral event — 'not tonight' — into a referendum you called on yourself. His no was complete information, not an opening bid. The need to be an exception is the least exceptional thing in that queue."
            },
            {
              "text": "Walk away silent, then rejoin the queue forty minutes later wearing Jonas's jacket.",
              "aura": -100,
              "feedback": "Points for audacity, minus points for the premise: that the first no was a clerical error about outerwear. It wasn't. You spent forty minutes of your one Saturday appealing a verdict nobody will remember but you."
            },
            {
              "text": "Nod. 'Alles gut.' Lead everyone to a späti, then Sisyphos. Become the night's best decision.",
              "aura": 500,
              "feedback": "This is grace: taking the no at face value with your mood intact. The night wasn't inside that building; it was in your keeping the whole time. Watch your flatmates relax — you just showed everyone the door has no power over people who have somewhere else to be."
            }
          ],
          "fieldNote": {
            "principle": "Indifference is not insult",
            "source": "Oliver Burkeman, Four Thousand Weeks",
            "text": "Burkeman's consolation: the universe is mostly indifferent to you, and this is excellent news — a closed door is traffic, not judgment. The bouncer wasn't assessing your worth; he was curating a room. Stop reading verdicts into neutral events and most of your suffering quietly loses its funding."
          }
        },
        {
          "title": "The Synth Talk",
          "setup": "Jonas produces modular techno. Specifically: at 1 a.m., through a wall with the acoustic integrity of a poppadom. You've been tallying since June — sighs deployed, sleep lost, headphones considered as a gift. Tonight it starts again, a bassline like a heartbeat with ambitions. Your notes app contains a document titled 'EVIDENCE'. It is 4 a.m. somewhere in your soul.",
          "choices": [
            {
              "text": "Print a laminated 'QUIET HOURS?? :)' sign for the kitchen. Sign it 'the flat'.",
              "aura": -100,
              "feedback": "The smiley makes it worse — passive aggression with plausible deniability. Anonymous notes ask the wall to have the conversation for you. Jonas will feel accused by the flat itself, change nothing, and you'll add his non-response to EVIDENCE."
            },
            {
              "text": "Present the EVIDENCE document chronologically, beginning with the June incident involving the blender.",
              "aura": -600,
              "feedback": "The audit feels righteous because it's all true. But arriving with three months of receipts tells Jonas the real issue: you've been prosecuting him in absentia while smiling at breakfast. Now he's defending a trial he didn't know was scheduled. He won't hear item one."
            },
            {
              "text": "Knock, friendly and specific: 'Bass wakes me after midnight. Could you switch to headphones at eleven?'",
              "aura": 550,
              "feedback": "Calm, specific, today, one issue, one request. Jonas can actually say yes to this — nobody can say yes to an atmosphere. Weeks of silent tallying weren't patience; they were fear of one mildly awkward minute. The minute costs less than June through July did."
            }
          ],
          "fieldNote": {
            "principle": "Criticism hides a wish",
            "source": "Esther Perel",
            "text": "Perel's observation from decades of hearing couples fight: most criticism is a wish in disguise, delivered too late, as an attack. 'You never think of anyone' hides 'I want to sleep.' Say the wish while it's small and it's a request; hoard it and it ferments into a verdict. Same words, different vintage."
          }
        },
        {
          "title": "The Sunday Call",
          "setup": "Sunday, 8 a.m. — your mother's preferred hour, calculated across time zones with actuarial precision. Both parents on video, heads at competing angles. Papa mentions the Gurgaon consulting offer again; the aunty network has confirmed it's 'still open through Diwali'. You're not taking it. You decided in April. You've spent three months saying 'dekhte hain'. The Kreuzberg light comes up gold behind your laptop.",
          "choices": [
            {
              "text": "'Haan, still thinking. Big decision, na?' Buy one more month of everyone's peace.",
              "aura": -100,
              "feedback": "'Dekhte hain' is a loan against future courage, and the interest compounds: every deferral makes the eventual truth look more like betrayal. You're not protecting them from disappointment — you're protecting yourself from witnessing it. They can survive knowing you. Let them."
            },
            {
              "text": "'I'm not taking it. I'm staying in Berlin, building freelance. I know it scares you — talk to me.'",
              "aura": 1000,
              "feedback": "This is the whole month in one move: true, kind, no exit ramps. You didn't defend or deflect. Naming their fear keeps you on their side of the table while the news lands. Staying on the call while they're upset is the real boundary: truth, held gently, without withdrawal."
            },
            {
              "text": "'It's my life, Papa. I'm twenty-seven. This conversation is over.' End the call, hands shaking.",
              "aura": -800,
              "feedback": "The words were finally true; the exit made them a weapon. Hanging up isn't a boundary — it's a collapse wearing armor. Boundaries end behaviors, not conversations with people you love. Now they'll remember the disconnection, not the decision, and you'll have to do this again anyway."
            }
          ],
          "fieldNote": {
            "principle": "Separation of tasks",
            "source": "Alfred Adler, via The Courage to Be Disliked",
            "text": "Adler's dividing line: whose task is this? Choosing your work is yours — nobody else lives your life. How your parents feel about the choice is theirs, and taking that task from them by lying, or managing them with 'dekhte hain', helps no one. The courage to be disliked includes, hardest of all, by family — briefly, survivably."
          }
        }
      ]
    },
    {
      "id": "tokyo",
      "name": "Tokyo",
      "flag": "🇯🇵",
      "tagline": "The Craft",
      "sub": "Mastery, presence & inner game",
      "color": "#fb7185",
      "color2": "#f59e0b",
      "intro": "Two weeks, alone — the first trip nobody made you take. Tokyo is what happens when an entire city decides that doing things properly is a personality. Final chapter: the craft. No audience, no scoreboard, no aunties. Just you, your attention, and the person you practice being when no one is watching.",
      "clearPerfect": "Reps, presence, patience — the quiet trifecta. The master at the counter would nod at you. That is the entire review, and it's a rave.",
      "clearGood": "You sat with yourself and didn't flinch. Most trips never get there. The craft continues at home — it was never about the trip.",
      "clearRough": "The noise came with you. Normal — you can't outrun your own head over the Pacific. But you know the direction now, and the counter seat isn't going anywhere.",
      "scenarios": [
        {
          "title": "Forty Years of Tuesday",
          "setup": "Kappabashi, the kitchen-street, 9 a.m. In the back of a knife shop, a seventy-year-old sharpener named Morita-san draws a blade across a whetstone. Same stroke. Again. Again. His apprentice — your age — isn't sharpening anything. He flattens stones. That's the whole job for the first two years. Nobody is filming. Nothing here would clip well. You watch for a long time.",
          "choices": [
            {
              "text": "Buy the ¥42,000 knife. You cook twice a year, but this feels like investing in the craft.",
              "aura": -500,
              "feedback": "You tried to buy the feeling instead of earning it — same instinct as the unused gym membership and the seventeen self-improvement PDFs. Owning the master's knife gets you nothing; the part he'd sell you can't be sold. It's the ten thousand boring strokes. Put the card away."
            },
            {
              "text": "Stay the full hour. That night, do your own forty boring minutes of the thing you've been dodging.",
              "aura": 600,
              "feedback": "This is the whole secret and you just did it. Mastery is mostly private, mostly boring, and mostly repetition nobody applauds. You watched a man be great at maintenance, then went and did yours. The apprentice flattening stones is not waiting for his life to start. Neither are you, tonight."
            },
            {
              "text": "Film fifteen seconds for Log Kya Kahenge. Caption: 'this is what locked in actually looks like.'",
              "aura": 50,
              "feedback": "Harmless, and the chat will love it. But notice the reflex: thirty seconds in, you converted a lesson into content. The clip says 'discipline is beautiful.' Watching the other forty minutes would have taught you what it costs. You shared the moral and skipped the class."
            }
          ],
          "fieldNote": {
            "principle": "The unfilmed reps",
            "source": "Jiro Dreams of Sushi (dir. David Gelb)",
            "text": "In the documentary, Jiro's apprentices spend years on rice and hot towels before touching fish; one made tamago over two hundred times before Jiro accepted a single piece. The lesson isn't cruelty, it's arithmetic: excellence is a very large number of unwitnessed repetitions. The years nobody films are not the delay before mastery. They are the mastery."
          }
        },
        {
          "title": "The Aunty Broadcast System",
          "setup": "Day six. Sunita aunty in Anaheim has seen your story from Shinjuku and filed a report. Your mother calls at 3 a.m. her time: 'Beta, aunty is saying you are roaming Japan alone like a lost person. People are asking.' Meanwhile Log Kya Kahenge has rebranded your trip 'the eat-pray-L arc.' You're standing outside a 7-Eleven holding an egg sandwich.",
          "choices": [
            {
              "text": "Spend the evening drafting a point-by-point defense of the trip. Three revisions. Send it to everyone.",
              "aura": -550,
              "feedback": "You just spent your one night in Shinjuku litigating your life to a jury that never adjourns. The need underneath: if you argue well enough, they'll finally issue the approval you've been waiting on since school. They won't. Approval withheld isn't a case to win; it's weather."
            },
            {
              "text": "Reply 'eat pray L arc confirmed' with a selfie. Then privately stew about it all evening.",
              "aura": 100,
              "feedback": "The joke is the right public move — you didn't take the bait. But the three-hour private spiral means the aunty verdict still got inside. You performed unbotheredness instead of having it. Half credit: the mask was good. The face underneath was still asking permission."
            },
            {
              "text": "Tell Ma you love her and you're safe, call Sunday. Let the aunties run their programming.",
              "aura": 600,
              "feedback": "Clean separation. Your mother's worry is love wearing a bad disguise — you answered the love and skipped the disguise. What Sunita aunty broadcasts is her task; what you do with your one July in Tokyo is yours. You can't run both departments. Tonight you resigned from hers."
            }
          ],
          "fieldNote": {
            "principle": "Separation of tasks",
            "source": "The Courage to Be Disliked (Kishimi & Koga)",
            "text": "Adler's move, via Kishimi and Koga: for any problem, ask whose task it is — who actually bears the consequence? Your life choices are your task. Other people's opinions of those choices are theirs, and barging into their task is how you make yourself miserable. Freedom, in this framing, literally is the courage to be disliked."
          }
        },
        {
          "title": "One Day, No Witnesses",
          "setup": "A whole free Tuesday, no plans. Three drafts of the day exist in your head: the spreadsheet version — fourteen pinned spots, colour-coded, optimized; the broadcast version — stories from every stop so the chat knows Tokyo is being experienced; and a third version you've honestly never tried. Outside, Yanaka is doing its quiet old-city thing: cats, temples, a bakery smell.",
          "choices": [
            {
              "text": "Phone in the bag. Walk Yanaka with no route until dark. One photo, at the end, for you.",
              "aura": 550,
              "feedback": "By 11 a.m. the withdrawal stops and something old switches back on: you notice things. A cat asleep on a shrine donation box. The specific green of the trains. This is what attention feels like when you're not spending it on being seen. The day happened to you, not to your audience."
            },
            {
              "text": "Document everything. Stories from all fourteen stops. The chat needs to see this in real time.",
              "aura": -450,
              "feedback": "You spent Tokyo looking at Tokyo through a six-inch screen, curating for twenty-three people who were half-watching between meetings. The fear underneath: if it isn't witnessed, it didn't count. But the witness you're auditioning for was supposed to be you. You'll have footage of a day you weren't at."
            },
            {
              "text": "Execute the itinerary. Fourteen spots, timed intervals. Efficiency is just respect for the trip, really.",
              "aura": -50,
              "feedback": "You saw everything and experienced almost none of it, because you spent the day managing a project called Tuesday. Optimization is how anxious people pray. Thirteen boxes ticked, and your clearest memory is checking Google Maps. The trip was under control the whole time, which was the problem."
            }
          ],
          "fieldNote": {
            "principle": "Attention is the currency",
            "source": "Oliver Burkeman, Four Thousand Weeks",
            "text": "Burkeman's blunt accounting: your life is simply the sum of what you pay attention to — so attention isn't a resource that helps you live, it's the living itself. Spend a day attending to your feed's reaction to Tokyo, and that, not Tokyo, is what your life was made of that day. There is no highlight reel later. This is the reel."
          }
        },
        {
          "title": "The Meera Problem",
          "setup": "A coworking café in Shibuya. The woman sharing your table — Meera, twenty-seven, Leicester accent — is in Tokyo because her indie game just crossed 400,000 wishlists. She's relaxed about it the way people are relaxed about things they no longer need to mention. She asks what you do. You hear yourself add two qualifiers and one apology to the answer.",
          "choices": [
            {
              "text": "Casually inflate your own numbers. Mention the 'exciting stuff in the pipeline.' Maintain eye contact.",
              "aura": -100,
              "feedback": "Resume-battling a woman who wasn't competing. She noticed — people who've shipped always notice — and the conversation politely died. The fear underneath: that her success, sitting there unmentioned, was somehow testimony against you. It wasn't, until you started deposing witnesses."
            },
            {
              "text": "Wrap up early, head back, and study her entire internet history from your bunk until 1 a.m.",
              "aura": -500,
              "feedback": "Four hours of forensic scrolling — her old dev logs, her early bad pixel art, her timeline — searching for evidence that she's a fluke or you're a failure. Both verdicts hurt and neither helps. You've converted a person into a mirror and then punched it. She's not your verdict. She's proof of a road."
            },
            {
              "text": "Tell her it's genuinely impressive. Then ask how — the boring how. Take actual notes.",
              "aura": 650,
              "feedback": "'How' is the anti-spiral. She talks for an hour: four years, two dead games nobody played, a Discord of nine people. The gap between you shrinks from 'different species' to 'more Tuesdays.' Envy asks 'why her?' Admiration asks 'what's the mechanism?' Only one of those questions has a useful answer."
            }
          ],
          "fieldNote": {
            "principle": "Success as information",
            "source": "Carol Dweck, Mindset",
            "text": "Dweck's research splits people by what another person's success does to them. Fixed mindset hears a verdict: they have it, you don't. Growth mindset hears data: it's learnable, here's an existence proof. Same Meera, same wishlists — one reading sends you spiraling at 1 a.m., the other sends you home with notes. The only real benchmark is you, twelve months ago."
          }
        },
        {
          "title": "Table for One",
          "setup": "Eight seats at a tempura counter in Nakameguro, and one is yours. The chef, Sato-san, works in silence a metre away. No wifi password on the wall — there is no wifi. The couple beside you murmurs in Japanese. It's you, hot oil, and the longest you've sat alone with yourself, unarmed, in possibly years. Your phone weighs a thousand pounds in your pocket.",
          "choices": [
            {
              "text": "Prop the phone against the soy sauce bottle. Old highlights, muted, just so there's something happening.",
              "aura": -450,
              "feedback": "Rescue-scrolling: using the feed as a chaperone so you're never technically alone with yourself. The question you're avoiding isn't on the phone — it's the quiet one about whether your own company is enough. Every meal you outsource to the screen votes no. Sato-san made you fourteen courses. You watched a phone."
            },
            {
              "text": "Phone stays in the coat. Watch the oil, eat slowly, trade ten words of bad Japanese with Sato-san.",
              "aura": 600,
              "feedback": "Twenty minutes in, the silence stops being a problem and becomes the point. This is the finding: you're decent company. Every relationship you'll ever have sits on top of this one — the ability to be alone without being abandoned. Sato-san nods at your empty plate. Best dinner party of the trip, attendance: one."
            },
            {
              "text": "Take one artful photo of the anago. Caption: 'table for one and honestly thriving.' Post, then check.",
              "aura": 100,
              "feedback": "You mostly had the dinner — but 'thriving' posted mid-meal is solitude with a press office. If it were fully true you wouldn't need it notarized by likes. The checking is the tell: four glances in ten minutes. Real contentment is the one thing that doesn't need an announcement."
            }
          ],
          "fieldNote": {
            "principle": "Solitude vs. loneliness",
            "source": "Paul Tillich, The Eternal Now",
            "text": "Tillich drew the line in one sentence: language created 'loneliness' for the pain of being alone, and 'solitude' for the glory of it. Same empty chair, opposite experiences — the difference is whether you're fleeing your own company or keeping it. Solitude is a skill, and it's load-bearing: everyone you ever love will meet whichever version of alone you've practiced."
          }
        },
        {
          "title": "1,014 Subscribers",
          "setup": "Hostel rooftop, 11 p.m. You open the analytics out of habit. Fourteen months of videos: 1,014 subscribers. Up six this week. Meanwhile a guy from your college just went viral explaining stock tips he clearly learned that morning — 2.3 million views. Your thumb hovers over a drafted message to yourself: 'maybe this was always cringe.' Tokyo glitters, indifferent.",
          "choices": [
            {
              "text": "Close analytics. Film video sixty-one right there — the knife-maker story. Publish before bed.",
              "aura": 650,
              "feedback": "You just did the only thing that was ever in your control: the next rep. 1,014 people chose you — that's a packed theatre, if you saw them as a room instead of a number. Compounding is boring right up until it isn't, and nobody gets to skip the boring part. Sixty-one."
            },
            {
              "text": "Announce a strategic pivot. New niche, new name, delete the old videos. Fresh start energy.",
              "aura": 50,
              "feedback": "The pivot feels like action but smell it closely: it's quitting wearing a lanyard. Fourteen months of learning, audience trust, and searchable back-catalogue — deleted so you can restart the hard first year from zero. Sometimes a pivot is wisdom. This one is just the pain of invisibility, rebranded."
            },
            {
              "text": "Delete the channel. It was cringe. Text the chat 'lol glad I dropped that era.'",
              "aura": -600,
              "feedback": "You didn't delete a channel; you deleted rep 400 of 1,000 because the scoreboard hadn't caught up to the work. 'It was cringe' is the story pride tells so quitting feels like taste. The worst part isn't the lost videos. It's teaching yourself that invisible growth means no growth."
            }
          ],
          "fieldNote": {
            "principle": "Compounding looks like nothing",
            "source": "Morgan Housel, The Psychology of Money",
            "text": "Housel's favourite fact: the overwhelming majority of Warren Buffett's fortune arrived after his mid-sixties — not because the returns improved, but because compounding is violently back-loaded. Nothing, nothing, nothing, then everything. The chart of any long game looks like a flat line followed by a hockey stick, and almost everyone quits somewhere on the flat part, inches from the bend."
          }
        },
        {
          "title": "The Mirror",
          "setup": "Last night in Tokyo. The hostel common room smells of instant ramen and someone's laundry. Dev, twenty-two, New Jersey, has apologized four times for existing. He shows you a text thread — 'why would Priya stop replying?' — then goes quiet and asks the real question: 'How are you so relaxed?' He is you, chapter one, down to the nervous laugh. The room waits.",
          "choices": [
            {
              "text": "Give him the rules: wait double Priya's reply time, act unbothered, never text first twice. Protect the aura.",
              "aura": -850,
              "feedback": "You handed him a costume of calm and called it calm. Rules are scarcity with a system — they teach him Priya's reply is a scoreboard, which is the exact belief eating him. Her silence is an answer, not a puzzle. He came to the one person who knew better, and you sold him the counterfeit."
            },
            {
              "text": "Buy him a coffee. 'It was never about her. Build your thing, ask plainly, tell the truth, play.'",
              "aura": 1100,
              "feedback": "Five cities in one sentence, and he heard it because you weren't selling anything. Author your own life; ask for what you want out loud; keep it playful; tell the truth even when it costs; do the reps nobody films. The calm he's asking about is just what's left when the audition ends. Somewhere, chapter-one you finally exhales."
            },
            {
              "text": "Ninety minutes, five cities, the whole syllabus. Book recommendations. He takes notes on his phone.",
              "aura": 300,
              "feedback": "Generous, true, and about eighty minutes too long. He needed a friend and got a curriculum; notes app open, nothing landing, because lectures bounce off what loneliness is holding up. Everything you said was right. The delivery said 'project,' not 'person.' Still — some seed lands. Points for the heart, minus the podcast."
            }
          ],
          "fieldNote": {
            "principle": "The game was never about them",
            "source": "Field research",
            "text": "Every city taught the same thing wearing different clothes: write your own script, ask out loud, stay playful, tell the truth, do the reps. None of it was ever a technique for other people — it was maintenance on the only person in every room you'll ever enter. Aura was never points. It was just what self-respect looks like from outside."
          }
        }
      ]
    }
  ]
};
