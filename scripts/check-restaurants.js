const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const restaurants = await prisma.restaurant.findMany({
    select: {
      id: true,
      name: true,
      status: true
    }
  });
  
  console.log('Restaurantes en la base de datos:');
  console.log(JSON.stringify(restaurants, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);

