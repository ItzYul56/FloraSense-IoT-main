import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@florasense.local';
  const password = 'FloraAdmin2026!';

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.log('El usuario administrador ya existe.');
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  await prisma.user.create({
    data: {
      name: 'Víctor (Admin)',
      email: email,
      passwordHash: passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('✅ Usuario semilla (Admin) creado correctamente.');
  console.log(`Email: ${email}`);
  console.log('Contraseña encriptada exitosamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
