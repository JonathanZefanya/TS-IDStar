const { PrismaClient } = require('@prisma/client');

const prisma = global.prismaClient || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prismaClient = prisma;
}

module.exports = prisma;
