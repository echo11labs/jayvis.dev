import {
  SearchQuery,
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  replaceAll,
  replaceNext,
  selectMatches,
  setSearchQuery,
} from '@codemirror/search';
import type { EditorView, Panel, ViewUpdate } from '@codemirror/view';

export function createStudioSearchPanel(view: EditorView): Panel {
  return new StudioSearchPanel(view);
}

class StudioSearchPanel implements Panel {
  readonly top = true;
  readonly dom: HTMLElement;
  private query: SearchQuery;
  private readonly searchInput: HTMLInputElement;
  private readonly replaceInput: HTMLInputElement;
  private readonly toggles: Record<'case' | 'regexp' | 'word', HTMLButtonElement>;

  constructor(private readonly view: EditorView) {
    this.query = getSearchQuery(view.state);
    this.searchInput = field('Find');
    this.searchInput.setAttribute('main-field', 'true');
    this.replaceInput = field('Replace');
    this.toggles = {
      case: toggle('Case', 'Match case'),
      regexp: toggle('Regex', 'Regular expression'),
      word: toggle('Word', 'Whole word'),
    };

    const close = button('Close', 'Close find');
    close.classList.add('jv-find-close');
    close.textContent = '×';

    const findRow = row(
      this.searchInput,
      close,
      actions(
        button('Next', 'Next match', () => findNext(view)),
        button('Previous', 'Previous match', () => findPrevious(view)),
        button('Select all', 'Select all matches', () => selectMatches(view)),
        this.toggles.case,
        this.toggles.regexp,
        this.toggles.word,
      ),
    );
    const replaceRow = row(
      this.replaceInput,
      actions(
        button('Replace', 'Replace match', () => replaceNext(view)),
        button('Replace all', 'Replace all matches', () => replaceAll(view)),
      ),
    );

    this.dom = document.createElement('div');
    this.dom.className = 'jv-find';
    this.dom.append(findRow, replaceRow);
    this.dom.addEventListener('keydown', (event) => this.onKeyDown(event));

    for (const input of [this.searchInput, this.replaceInput]) {
      input.addEventListener('input', () => this.commit());
    }
    for (const key of ['case', 'regexp', 'word'] as const) {
      this.toggles[key].addEventListener('click', () => {
        const pressed = this.toggles[key].getAttribute('aria-pressed') !== 'true';
        this.toggles[key].setAttribute('aria-pressed', String(pressed));
        this.commit();
      });
    }
    close.addEventListener('click', () => closeSearchPanel(view));
    this.paint(this.query);
  }

  mount() {
    this.searchInput.select();
  }

  update(update: ViewUpdate) {
    for (const transaction of update.transactions) {
      for (const effect of transaction.effects) {
        if (effect.is(setSearchQuery) && !effect.value.eq(this.query)) this.paint(effect.value);
      }
    }
  }

  private paint(query: SearchQuery) {
    this.query = query;
    if (this.searchInput.value !== query.search) this.searchInput.value = query.search;
    if (this.replaceInput.value !== query.replace) this.replaceInput.value = query.replace;
    this.toggles.case.setAttribute('aria-pressed', String(query.caseSensitive));
    this.toggles.regexp.setAttribute('aria-pressed', String(query.regexp));
    this.toggles.word.setAttribute('aria-pressed', String(query.wholeWord));
  }

  private commit() {
    const next = new SearchQuery({
      search: this.searchInput.value,
      replace: this.replaceInput.value,
      caseSensitive: pressed(this.toggles.case),
      regexp: pressed(this.toggles.regexp),
      wholeWord: pressed(this.toggles.word),
    });
    if (next.eq(this.query)) return;
    this.query = next;
    this.view.dispatch({ effects: setSearchQuery.of(next) });
  }

  private onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSearchPanel(this.view);
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (event.target === this.replaceInput) replaceNext(this.view);
    else if (event.shiftKey) findPrevious(this.view);
    else findNext(this.view);
  }
}

function field(label: string) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'jv-find-input';
  input.placeholder = label;
  input.setAttribute('aria-label', label);
  input.autocomplete = 'off';
  input.spellcheck = false;
  return input;
}

function button(label: string, title: string, onClick?: () => boolean) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'jv-find-btn';
  el.textContent = label;
  el.title = title;
  if (onClick) el.addEventListener('click', () => onClick());
  return el;
}

function toggle(label: string, title: string) {
  const el = button(label, title);
  el.classList.add('jv-find-toggle');
  el.setAttribute('aria-pressed', 'false');
  return el;
}

function pressed(el: HTMLButtonElement) {
  return el.getAttribute('aria-pressed') === 'true';
}

function actions(...children: HTMLElement[]) {
  const el = document.createElement('div');
  el.className = 'jv-find-actions';
  el.append(...children);
  return el;
}

function row(input: HTMLInputElement, ...rest: HTMLElement[]) {
  const el = document.createElement('div');
  el.className = 'jv-find-row';
  const head = document.createElement('div');
  head.className = 'jv-find-head';
  head.append(input, ...rest.filter((node) => !node.classList.contains('jv-find-actions')));
  const actionRow = rest.find((node) => node.classList.contains('jv-find-actions'));
  el.append(head);
  if (actionRow) el.append(actionRow);
  return el;
}
