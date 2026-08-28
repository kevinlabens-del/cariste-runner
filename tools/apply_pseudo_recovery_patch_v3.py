from pathlib import Path
import runpy

html_path = Path('accueil.html')
html = html_path.read_text(encoding='utf-8')

if 'id="pinInput"' not in html:
    start = html.find('  <div class="modal" id="nameModal"')
    end = html.find('\n\n<script>', start)
    if start < 0 or end < 0:
        raise SystemExit('Pseudo modal boundaries not found')

    modal_new = '''  <div class="modal" id="nameModal" role="dialog" aria-modal="true" aria-label="Gestion du pseudo">
    <div class="box">
      <h3 id="nameTitle" style="margin:0 0 10px;">Mon pseudo</h3>
      <p class="muted" id="nameHelp" style="margin:0 0 10px;">Choisis un pseudo et un code personnel à 4 chiffres.</p>
      <div class="name-mode-row" style="display:flex;gap:8px;margin:0 0 12px;">
        <button class="btn secondary" id="createNameModeBtn" type="button" style="flex:1;">Nouveau joueur</button>
        <button class="btn secondary" id="recoverNameModeBtn" type="button" style="flex:1;">Récupérer mon pseudo</button>
      </div>
      <div class="field" style="flex-wrap:wrap;">
        <input class="input" type="text" id="nameInput" placeholder="Ton pseudo" maxlength="20" autocomplete="nickname" style="flex-basis:100%;" />
        <input class="input" type="password" id="pinInput" placeholder="Code à 4 chiffres" maxlength="4" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="Code personnel à 4 chiffres" />
        <button class="btn icon-only-btn" id="saveNameBtn" type="button" aria-label="Valider" title="Valider">✅</button>
      </div>
      <div class="name-status" id="nameStatus" aria-live="polite">Aucune vérification permanente : le pseudo est contrôlé seulement à la création ou à la récupération.</div>
    </div>
  </div>'''

    html = html[:start] + modal_new + html[end:]
    html_path.write_text(html, encoding='utf-8')

source = Path('tools/apply_pseudo_recovery_patch.py').read_text(encoding='utf-8')
source = source.replace(
    "text = pattern.sub(js_new, text, count=1)",
    "text = pattern.sub(lambda _match: js_new, text, count=1)"
)
fixed = Path('tools/.apply_pseudo_recovery_patch_fixed.py')
fixed.write_text(source, encoding='utf-8')
runpy.run_path(str(fixed), run_name='__main__')
fixed.unlink(missing_ok=True)
