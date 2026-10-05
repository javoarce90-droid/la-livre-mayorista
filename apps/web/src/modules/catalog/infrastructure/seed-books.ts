import type { Availability, Book, Promotion } from "../domain/book";

type Row = [
  title: string,
  author: string,
  publisher: string,
  subject: string,
  year: number,
  pages: number,
  age: string | null,
  availability: "i" | "p" | "s",
];

const ROWS: Row[] = [
  ["Rayuela", "Cortázar, Julio", "Alfaguara", "Narrativa", 2019, 600, null, "p"],
  ["Casa tomada y otros cuentos", "Cortázar, Julio", "Alfaguara", "Narrativa", 2019, 184, "+12", "i"],
  ["Bestiario", "Cortázar, Julio", "Alfaguara", "Cuentos", 2016, 176, null, "i"],
  ["Ficciones", "Borges, Jorge Luis", "Debolsillo", "Cuentos", 2011, 224, null, "i"],
  ["El Aleph", "Borges, Jorge Luis", "Debolsillo", "Cuentos", 2011, 208, null, "i"],
  ["Cuentos completos", "Borges, Jorge Luis", "Lumen", "Cuentos", 2016, 560, null, "p"],
  ["Cien años de soledad", "García Márquez, Gabriel", "Literatura Random House", "Narrativa", 2017, 496, null, "i"],
  ["El amor en los tiempos del cólera", "García Márquez, Gabriel", "Debolsillo", "Narrativa", 2015, 464, null, "i"],
  ["Crónica de una muerte anunciada", "García Márquez, Gabriel", "Debolsillo", "Narrativa", 2014, 144, null, "s"],
  ["La casa de los espíritus", "Allende, Isabel", "Debolsillo", "Narrativa", 2018, 512, null, "s"],
  ["Paula", "Allende, Isabel", "Debolsillo", "Biografías", 2016, 400, null, "i"],
  ["Pedro Páramo", "Rulfo, Juan", "Editorial RM", "Narrativa", 2016, 128, null, "i"],
  ["El túnel", "Sabato, Ernesto", "Seix Barral", "Narrativa", 2011, 160, "+14", "i"],
  ["Sobre héroes y tumbas", "Sabato, Ernesto", "Seix Barral", "Narrativa", 2011, 560, null, "p"],
  ["Las cosas que perdimos en el fuego", "Enriquez, Mariana", "Anagrama", "Cuentos", 2016, 200, "+16", "i"],
  ["Nuestra parte de noche", "Enriquez, Mariana", "Anagrama", "Narrativa", 2019, 672, "+16", "i"],
  ["Distancia de rescate", "Schweblin, Samanta", "Literatura Random House", "Narrativa", 2014, 128, null, "i"],
  ["Kentukis", "Schweblin, Samanta", "Literatura Random House", "Narrativa", 2018, 224, null, "s"],
  ["Las aventuras de la China Iron", "Cabezón Cámara, Gabriela", "Literatura Random House", "Narrativa", 2017, 192, null, "i"],
  ["Ciencias morales", "Kohan, Martín", "Anagrama", "Narrativa", 2007, 208, null, "p"],
  ["Operación masacre", "Walsh, Rodolfo", "Ediciones de la Flor", "Ensayo", 2010, 256, null, "i"],
  ["Martín Fierro", "Hernández, José", "Colihue", "Poesía", 2015, 320, null, "i"],
  ["Don Segundo Sombra", "Güiraldes, Ricardo", "Losada", "Narrativa", 2012, 240, null, "p"],
  ["Mafalda: todas las tiras", "Quino", "Ediciones de la Flor", "Historieta", 2011, 672, "+8", "i"],
  ["El Eternauta", "Oesterheld, Héctor Germán", "Doedytores", "Historieta", 2015, 368, "+12", "i"],
  ["Cuentos de la selva", "Quiroga, Horacio", "Losada", "Infantil", 2010, 96, "+8", "i"],
  ["Cuentos de amor de locura y de muerte", "Quiroga, Horacio", "Losada", "Cuentos", 2010, 168, "+14", "s"],
  ["Manuelita, ¿dónde vas?", "Walsh, María Elena", "Alfaguara Infantil", "Infantil", 2014, 32, "+3", "i"],
  ["Dailan Kifki", "Walsh, María Elena", "Alfaguara Infantil", "Infantil", 2015, 160, "+8", "i"],
  ["El principito", "Saint-Exupéry, Antoine de", "Salamandra", "Infantil", 2015, 96, "+8", "i"],
  ["Harry Potter y la piedra filosofal", "Rowling, J. K.", "Salamandra", "Juvenil", 2020, 264, "+10", "i"],
  ["Harry Potter y la cámara secreta", "Rowling, J. K.", "Salamandra", "Juvenil", 2020, 288, "+10", "p"],
  ["Los juegos del hambre", "Collins, Suzanne", "Molino", "Juvenil", 2012, 400, "+12", "i"],
  ["Momo", "Ende, Michael", "Alfaguara Juvenil", "Juvenil", 2016, 304, "+12", "i"],
  ["La historia interminable", "Ende, Michael", "Alfaguara Juvenil", "Juvenil", 2016, 496, "+12", "s"],
  ["Sapiens. De animales a dioses", "Harari, Yuval Noah", "Debate", "Ensayo", 2015, 496, null, "i"],
  ["El infinito en un junco", "Vallejo, Irene", "Siruela", "Ensayo", 2019, 452, null, "p"],
  ["Las venas abiertas de América Latina", "Galeano, Eduardo", "Siglo XXI", "Ensayo", 2010, 384, null, "i"],
  ["El libro de los abrazos", "Galeano, Eduardo", "Siglo XXI", "Narrativa", 2009, 272, null, "i"],
  ["Patria", "Aramburu, Fernando", "Tusquets", "Narrativa", 2016, 648, null, "i"],
  ["La sombra del viento", "Ruiz Zafón, Carlos", "Planeta", "Narrativa", 2016, 576, null, "i"],
  ["Como agua para chocolate", "Esquivel, Laura", "Debolsillo", "Narrativa", 2016, 256, null, "p"],
  ["Ensayo sobre la ceguera", "Saramago, José", "Alfaguara", "Narrativa", 2015, 440, null, "i"],
  ["Veinte poemas de amor y una canción desesperada", "Neruda, Pablo", "Seix Barral", "Poesía", 2012, 96, null, "i"],
  ["Antología poética", "Storni, Alfonsina", "Losada", "Poesía", 2014, 192, null, "i"],
  ["Poesía completa", "Pizarnik, Alejandra", "Lumen", "Poesía", 2016, 464, null, "s"],
  ["La tregua", "Benedetti, Mario", "Planeta", "Narrativa", 2015, 192, null, "i"],
  ["Boquitas pintadas", "Puig, Manuel", "Seix Barral", "Narrativa", 2013, 240, null, "i"],
  ["El beso de la mujer araña", "Puig, Manuel", "Seix Barral", "Narrativa", 2013, 288, null, "p"],
  ["Elena sabe", "Piñeiro, Claudia", "Alfaguara", "Narrativa", 2007, 176, null, "i"],
  ["Las viudas de los jueves", "Piñeiro, Claudia", "Alfaguara", "Narrativa", 2005, 320, null, "i"],
  ["Una historia de la lectura", "Manguel, Alberto", "Siglo XXI", "Ensayo", 2011, 432, null, "i"],
  ["El libro de Doña Petrona", "Gandulfo, Petrona C. de", "Atlántida", "Cocina", 2015, 560, null, "p"],
  ["Los siete locos", "Arlt, Roberto", "Losada", "Narrativa", 2012, 304, null, "i"],
  ["El juguete rabioso", "Arlt, Roberto", "Losada", "Narrativa", 2012, 192, null, "i"],
  ["El matadero", "Echeverría, Esteban", "Colihue", "Narrativa", 2014, 96, null, "i"],
  ["Facundo", "Sarmiento, Domingo F.", "Colihue", "Ensayo", 2015, 400, null, "s"],
  ["Breve historia contemporánea de la Argentina", "Romero, Luis Alberto", "Fondo de Cultura Económica", "Historia", 2012, 360, null, "i"],
  ["El arte de la guerra", "Sun Tzu", "Edaf", "Ensayo", 2014, 160, null, "i"],
  ["Matilda", "Dahl, Roald", "Alfaguara Infantil", "Infantil", 2016, 240, "+8", "i"],
  ["Charlie y la fábrica de chocolate", "Dahl, Roald", "Alfaguara Infantil", "Infantil", 2016, 208, "+8", "p"],
];

const AVAILABILITY: Record<Row[7], Availability> = { i: "immediate", p: "on_order", s: "out_of_stock" };

const PROMOTIONS: Record<string, Promotion> = {
  "Casa tomada y otros cuentos": { name: "Promo invierno", percent: 5 },
  Bestiario: { name: "Promo invierno", percent: 5 },
  "El principito": { name: "Clásicos infantiles", percent: 15 },
  Matilda: { name: "Clásicos infantiles", percent: 15 },
  "Mafalda: todas las tiras": { name: "Semana de la historieta", percent: 10 },
  "La sombra del viento": { name: "Promo invierno", percent: 5 },
};

function ean13(twelveDigits: string): string {
  const sum = [...twelveDigits].reduce((acc, digit, index) => acc + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return `${twelveDigits}${(10 - (sum % 10)) % 10}`;
}

function displayName(author: string): string {
  const [last, first] = author.split(", ");
  return first ? `${first} ${last}` : last;
}

function review(title: string, author: string, subject: string): string {
  return `${title}, de ${displayName(author)}, es uno de los títulos de ${subject.toLowerCase()} más pedidos por las librerías. Una edición cuidada, ideal para mesa de novedades y para recomendar en mostrador.`;
}

export const SEED_BOOKS: readonly Book[] = ROWS.map(([title, author, publisher, subject, year, pages, age, availability], index) => {
  const pesos = Math.round((14_000 + pages * 38 + ((index * 1_370) % 9_000)) / 100) * 100;
  const month = String((index % 9) + 1).padStart(2, "0");
  return {
    code: String(100_000 + index * 137),
    isbn: ean13(`978950${String(400_000 + index * 7_919).padStart(6, "0")}`),
    title,
    author,
    publisher,
    listPrice: pesos * 100,
    priceDate: `2026-${month}-${String((index % 27) + 1).padStart(2, "0")}`,
    recommendedAge: age,
    availability: AVAILABILITY[availability],
    subject,
    year,
    language: "Español",
    pages,
    review: review(title, author, subject),
    promotion: PROMOTIONS[title] ?? null,
  };
});
