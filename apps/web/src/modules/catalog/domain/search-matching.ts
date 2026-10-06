import { normalizeText } from "@/shared/lib/text";
import type { Book } from "./book";
import type { SearchField, SearchQuery } from "./search-query";

function fieldValue(book: Book, field: SearchField): string {
  switch (field) {
    case "title":
      return book.title;
    case "author":
      return book.author;
    case "publisher":
      return book.publisher;
    case "isbn":
      return book.isbn;
    case "code":
      return book.code;
  }
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function sortByField(books: Book[], field: SearchField): Book[] {
  return [...books].sort(
    (a, b) =>
      compareText(normalizeText(fieldValue(a, field)), normalizeText(fieldValue(b, field))) ||
      compareText(normalizeText(a.title), normalizeText(b.title)) ||
      compareText(a.code, b.code),
  );
}

/** Default order when there is no text query (filters only). */
export function sortBooksByTitle(books: readonly Book[]): Book[] {
  return sortByField([...books], "title");
}

function isExactField(field: SearchField): boolean {
  return field === "isbn" || field === "code";
}

/** "978-950" → "978950" so ISBN fragments typed with dashes still match. */
function normalizeWord(word: string): string {
  return /^[\d-]+$/.test(word) ? word.replace(/-/g, "") : normalizeText(word);
}

function keywordHaystack(book: Book): string {
  return normalizeText([book.title, book.author, book.publisher, book.isbn, book.code].join(" "));
}

/** 0: title starts with the phrase · 1: every word is in the title · 2: words spread across fields. */
function keywordRank(book: Book, phrase: string, words: string[]): number {
  const title = normalizeText(book.title);
  if (title.startsWith(phrase)) return 0;
  if (words.every((word) => title.includes(word))) return 1;
  return 2;
}

function matchKeywords(books: readonly Book[], rawWords: string[]): Book[] {
  const words = rawWords.map(normalizeWord).filter(Boolean);
  const phrase = normalizeText(rawWords.join(" "));
  const matches = books.filter((book) => {
    const haystack = keywordHaystack(book);
    return words.every((word) => haystack.includes(word));
  });
  return sortByField(matches, "title").sort((a, b) => keywordRank(a, phrase, words) - keywordRank(b, phrase, words));
}

/** Applies a parsed query to a list of books, returning matches in display order. */
export function matchBooks(books: readonly Book[], query: SearchQuery): Book[] {
  switch (query.kind) {
    case "keywords":
      return matchKeywords(books, query.words);

    case "isbn":
      return books.filter((book) => book.isbn === query.isbn);

    case "contains": {
      const matches = books.filter((book) =>
        query.criteria.every(({ field, text }) =>
          isExactField(field)
            ? fieldValue(book, field) === text.trim()
            : normalizeText(fieldValue(book, field)).includes(normalizeText(text)),
        ),
      );
      return sortByField(matches, "title");
    }

    case "position": {
      const { field } = query;
      if (isExactField(field)) {
        return books.filter((book) => fieldValue(book, field) === query.text.trim());
      }
      const text = normalizeText(query.text);
      const matches =
        field === "publisher"
          ? books.filter((book) => normalizeText(book.publisher).startsWith(text))
          : books.filter((book) => normalizeText(fieldValue(book, field)) >= text);
      return sortByField(matches, field);
    }
  }
}
