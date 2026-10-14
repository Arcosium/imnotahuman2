"""Local ComfyUI generation using the existing Image Studio pipeline."""
from pathlib import Path
import sys

sys.path.insert(0, '/home/arcosium/projects/imggen')
from media.pipeline import txt2img

prompt = '''Cinematic concept art for a dystopian social deduction game. A vast underground AI council chamber built of black concrete and brushed dark metal, a single empty human-sized chair facing a monumental circular mechanical aperture on the right, six tall narrow server monoliths in the distance, abandoned megacity silhouettes behind fogged windows. Muted charcoal, silver-grey and a very restrained amber light. Grainy analog film, brutalist architecture, dramatic chiaroscuro, realistic environmental game art, precise architectural geometry, atmospheric dust, wide shot. Left third almost black with generous empty space for separate interface typography. No text, no letters, no logos, no symbols, no gore.''' 
root = Path(__file__).resolve().parents[1]
(root / '_workspace/art-prompt.txt').write_text(prompt)
data = txt2img(prompt, aspect='16:9', seed=214077)
(root / 'public/assets/council-chamber.png').write_bytes(data)
print('Generated public/assets/council-chamber.png', flush=True)
