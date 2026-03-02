import { PrismaClient } from "./generated/client/client";

const prisma = new PrismaClient();

const categories = [
  {
    name: "Moradia",
    children: [
      "Aluguel",
      "Condominio",
      "Energia",
      "Agua",
      "Gas",
      "Internet",
    ],
  },
  {
    name: "Alimentacao",
    children: ["Supermercado", "Restaurantes", "Delivery", "Padaria"],
  },
  {
    name: "Transporte",
    children: [
      "Combustivel",
      "Transporte Publico",
      "Estacionamento",
      "Manutencao Veiculo",
    ],
  },
  {
    name: "Saude",
    children: ["Plano de Saude", "Farmacia", "Consultas"],
  },
  {
    name: "Educacao",
    children: ["Mensalidade", "Cursos", "Livros"],
  },
  {
    name: "Lazer",
    children: ["Entretenimento", "Viagens", "Esportes"],
  },
  {
    name: "Servicos e Assinaturas",
    children: ["Streaming", "Software", "Telefonia"],
  },
  {
    name: "Vestuario",
    children: ["Roupas", "Calcados"],
  },
  {
    name: "Financeiro",
    children: ["Investimentos", "Taxas Bancarias", "Seguros", "Impostos"],
  },
  {
    name: "Renda",
    children: ["Salario", "Freelance", "Rendimentos"],
  },
];

async function main() {
  for (const cat of categories) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, parent_id: null },
    });
    if (!existing) {
      await prisma.category.create({ data: { name: cat.name } });
    }
  }

  const parents = await prisma.category.findMany({
    where: { parent_id: null },
  });
  const parentMap = new Map(parents.map((p) => [p.name, p.id]));

  for (const cat of categories) {
    const parentId = parentMap.get(cat.name);
    if (!parentId) {
      throw new Error(
        `Parent category "${cat.name}" not found after creation. Check seed data integrity.`
      );
    }
    for (const childName of cat.children) {
      await prisma.category.upsert({
        where: { name_parent_id: { name: childName, parent_id: parentId } },
        update: {},
        create: { name: childName, parent_id: parentId },
      });
    }
  }

  const totalParents = await prisma.category.count({
    where: { parent_id: null },
  });
  const totalChildren = await prisma.category.count({
    where: { NOT: { parent_id: null } },
  });
  console.log(
    `Seeded ${totalParents} parent categories and ${totalChildren} subcategories`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
