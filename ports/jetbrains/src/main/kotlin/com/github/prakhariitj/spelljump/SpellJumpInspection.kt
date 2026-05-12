// =============================================================================
// SpellJumpInspection.kt — JetBrains IntelliJ inspection that uses the detector
// Registers underlines in the editor and a "Jump to next typo" action.
// =============================================================================

package com.github.prakhariitj.spelljump

import com.intellij.codeInspection.*
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.editor.ScrollType
import com.intellij.openapi.ui.Messages
import com.intellij.psi.PsiFile

// ── Inspection: shows wavy underlines + Problems panel entries ────────────────
class SpellJumpInspection : LocalInspectionTool() {

    override fun getDisplayName()  = "SpellJump — Typo detected"
    override fun getGroupDisplayName() = "SpellJump 🦇"
    override fun getShortName()    = "SpellJumpTypo"
    override fun isEnabledByDefault() = true

    override fun checkFile(
        file: PsiFile,
        manager: InspectionManager,
        isOnTheFly: Boolean,
    ): Array<ProblemDescriptor> {
        val text    = file.text
        val typos   = SpellJumpDetector.detect(text)
        val results = mutableListOf<ProblemDescriptor>()

        for (typo in typos) {
            // Clamp offsets to valid range
            val start = typo.start.coerceIn(0, text.length - 1)
            val end   = (typo.end - 1).coerceIn(start, text.length - 1)

            val element = file.findElementAt(start) ?: continue
            val fixes: Array<LocalQuickFix> = if (typo.fix != null) {
                arrayOf(SpellJumpQuickFix(typo.fix))
            } else emptyArray()

            results.add(
                manager.createProblemDescriptor(
                    element,
                    typo.message,
                    isOnTheFly,
                    fixes,
                    ProblemHighlightType.GENERIC_ERROR_OR_WARNING,
                )
            )
        }
        return results.toTypedArray()
    }
}

// ── Quick Fix: replaces the typo with the suggested correction ────────────────
class SpellJumpQuickFix(private val fix: String) : LocalQuickFix {
    override fun getName()         = "SpellJump: Replace with \"$fix\""
    override fun getFamilyName()   = "SpellJump"

    override fun applyFix(project: com.intellij.openapi.project.Project, descriptor: ProblemDescriptor) {
        val element = descriptor.psiElement ?: return
        val factory = com.intellij.psi.PsiFileFactory.getInstance(project)
        // Generic text replacement via the document
        val doc = com.intellij.psi.util.PsiUtilBase
            .getDocumentAtOffset(element.containingFile, element.textOffset) ?: return
        val range = element.textRange
        doc.replaceString(range.startOffset, range.endOffset, fix)
    }
}

// ── Action: Jump to Next Typo (Ctrl+Shift+J equivalent) ──────────────────────
class SpellJumpNextAction : AnAction("SpellJump: Jump to Next Typo") {

    override fun actionPerformed(e: AnActionEvent) {
        val editor  = e.getData(CommonDataKeys.EDITOR) ?: return
        val psiFile = e.getData(CommonDataKeys.PSI_FILE) ?: return
        val text    = psiFile.text
        val typos   = SpellJumpDetector.detect(text)

        if (typos.isEmpty()) {
            Messages.showInfoMessage("SpellJump: no typos found! 🦇", "SpellJump")
            return
        }

        val cursorOffset = editor.caretModel.offset
        // Find next typo after cursor, wrapping around
        val target = typos.firstOrNull { it.start > cursorOffset } ?: typos.first()

        // Jump cursor to the END of the error span (same as jumper.ts)
        editor.caretModel.moveToOffset(target.end)
        editor.scrollingModel.scrollToCaret(ScrollType.CENTER)
        Messages.showInfoMessage(target.message, "SpellJump 🦇")
    }
}

// ── Action: Jump to Previous Typo (Ctrl+Shift+K equivalent) ──────────────────
class SpellJumpPreviousAction : AnAction("SpellJump: Jump to Previous Typo") {

    override fun actionPerformed(e: AnActionEvent) {
        val editor  = e.getData(CommonDataKeys.EDITOR) ?: return
        val psiFile = e.getData(CommonDataKeys.PSI_FILE) ?: return
        val text    = psiFile.text
        val typos   = SpellJumpDetector.detect(text)

        if (typos.isEmpty()) {
            Messages.showInfoMessage("SpellJump: no typos found! 🦇", "SpellJump")
            return
        }

        val cursorOffset = editor.caretModel.offset
        val target = typos.lastOrNull { it.end < cursorOffset } ?: typos.last()

        editor.caretModel.moveToOffset(target.end)
        editor.scrollingModel.scrollToCaret(ScrollType.CENTER)
        Messages.showInfoMessage(target.message, "SpellJump 🦇")
    }
}
