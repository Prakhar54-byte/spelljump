// =============================================================================
// SpellJumpDetector.kt — JetBrains port of SpellJump
// Same detection logic as detector.ts (TypeScript → Kotlin)
// Package: com.github.prakhariitj.spelljump
// =============================================================================

package com.github.prakhariitj.spelljump

data class Typo(
    val word: String,
    val start: Int,
    val end: Int,
    val message: String,
    val fix: String?,
    val kind: String,
)

object SpellJumpDetector {

    // ── Known Corrections (same map as detector.ts) ───────────────────────────
    private val knownCorrections = mapOf(
        "adress"     to Pair("address",   "Common spelling mistake."),
        "recieve"    to Pair("receive",   "Use i before e here."),
        "teh"        to Pair("the",       "Letters appear swapped."),
        "occured"    to Pair("occurred",  "Common spelling mistake."),
        "seperate"   to Pair("separate",  "Common spelling mistake."),
        "definately" to Pair("definitely","Common spelling mistake."),
        "wierd"      to Pair("weird",     "Common spelling mistake."),
        "theirr"     to Pair("their",     "Possible extra character."),
        "thier"      to Pair("their",     "Letters appear swapped."),
        "grammer"    to Pair("grammar",   "Common spelling mistake."),
        "langauge"   to Pair("language",  "Letters appear swapped."),
        "funtion"    to Pair("function",  "Possible missing character."),
        "naame"      to Pair("name",      "Possible extra character."),
    )

    // 🦇 DC Batman Easter Eggs (same as detector.ts)
    private val batmanEggs = mapOf(
        "batman"   to Pair("Bruce Wayne",              "🦇 I am vengeance. I am the night. I am BATMAN!"),
        "joker"    to Pair("Clown Prince of Crime",    "🃏 Why so serious?"),
        "gotham"   to Pair("Gotham City",              "🌃 This city needs a hero. Where is Batman?"),
        "alfred"   to Pair("Alfred Pennyworth",        "🎩 Shall I prepare the Batmobile, sir?"),
        "riddler"  to Pair("Edward Nygma",             "❓ Riddle me this, riddle me that..."),
        "catwoman" to Pair("Selina Kyle",              "🐱 Meow. The cat burglar strikes again."),
        "robin"    to Pair("Boy Wonder",               "🐦 Holy typos, Batman!"),
        "bane"     to Pair("The Man Who Broke the Bat","💪 You merely adopted the dark. I was born in it."),
        "arkham"   to Pair("Arkham Asylum",            "🏚️ Welcome to the madhouse."),
        "batcave"  to Pair("The Batcave",              "🦇 Accessing the Batcomputer... Typo detected!"),
    )

    // ── Allowed double-letter pairs (same as isAllowedDoubleLetter in TS) ─────
    private val allowedDoubles = setOf(
        "ll","ss","ee","oo","tt","ff","rr","nn","mm","pp","cc","dd"
    )

    // ── Find all suspicious repeats (same as findAllSuspiciousRepeats in TS) ──
    private fun findAllSuspiciousRepeats(word: String): List<Int> {
        val indices = mutableListOf<Int>()
        var inRun = false
        for (i in 1 until word.length) {
            val cur  = word[i].lowercaseChar()
            val prev = word[i - 1].lowercaseChar()
            val pair = "${word[i-1]}${word[i]}".lowercase()
            if (cur == prev && !allowedDoubles.contains(pair)) {
                if (!inRun) {
                    indices.add(i - 1) // index of FIRST char in repeated pair
                    inRun = true
                }
            } else {
                inRun = false
            }
        }
        return indices
    }

    // ── Main detection (same as detectLowLevelTypos in TS) ───────────────────
    fun detect(text: String): List<Typo> {
        val typos = mutableListOf<Typo>()
        val wordPattern = Regex("[A-Za-z][A-Za-z']*[A-Za-z]?")

        for (match in wordPattern.findAll(text)) {
            val word  = match.value
            val start = match.range.first
            val end   = match.range.last + 1
            val lower = word.lowercase()

            // 1) Known corrections
            knownCorrections[lower]?.let { (fix, msg) ->
                typos.add(Typo(word, start, end, msg, fix, "known"))
                return@let
            }?.also { return@also }

            if (knownCorrections.containsKey(lower)) continue

            // 2) Batman Easter Eggs 🦇
            batmanEggs[lower]?.let { (fix, msg) ->
                typos.add(Typo(word, start, end, msg, fix, "egg"))
            }
            if (batmanEggs.containsKey(lower)) continue

            // 3) Suspicious repeated characters
            val repeats = findAllSuspiciousRepeats(word)
            for (rep in repeats) {
                val errStart = start + rep
                typos.add(
                    Typo(
                        word    = word,
                        start   = errStart,
                        end     = errStart + 1,
                        message = "Suspicious repeated \"${word[rep]}\".",
                        fix     = word.substring(0, rep) + word.substring(rep + 1),
                        kind    = "repeat",
                    )
                )
            }
        }

        return typos.sortedBy { it.start }
    }
}
