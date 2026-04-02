const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const userPassword = await bcrypt.hash('User123!', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      name: 'System Admin',
      roleSystem: 'admin',
      roleJob: 'Administrator',
      department: 'IT',
      location: 'Head Office',
      project: 'Timesheet Management System',
      teamLeadName: 'N/A',
      deptHeadName: 'N/A',
      password: adminPassword
    },
    create: {
      name: 'System Admin',
      roleSystem: 'admin',
      roleJob: 'Administrator',
      department: 'IT',
      location: 'Head Office',
      project: 'Timesheet Management System',
      teamLeadName: 'N/A',
      deptHeadName: 'N/A',
      username: 'admin',
      password: adminPassword
    }
  });

  await prisma.user.upsert({
    where: { username: 'jonathan.zefanya' },
    update: {
      name: 'Jonathan Zefanya',
      roleSystem: 'user',
      roleJob: 'Programmer',
      department: 'PSI',
      location: 'BPJS Kesehatan Pusat',
      project: 'VClaim',
      teamLeadName: 'Muhammad Yazid Al Qahar',
      deptHeadName: 'Agung Tri Mulyanto',
      password: userPassword
    },
    create: {
      name: 'Jonathan Zefanya',
      roleSystem: 'user',
      roleJob: 'Programmer',
      department: 'PSI',
      location: 'BPJS Kesehatan Pusat',
      project: 'VClaim',
      teamLeadName: 'Muhammad Yazid Al Qahar',
      deptHeadName: 'Agung Tri Mulyanto',
      username: 'jonathan.zefanya',
      password: userPassword
    }
  });

  const sampleHolidays = [
    {
      date: new Date('2026-01-01T00:00:00.000Z'),
      name: 'Tahun Baru Masehi'
    },
    {
      date: new Date('2026-12-25T00:00:00.000Z'),
      name: 'Hari Raya Natal'
    }
  ];

  for (const holiday of sampleHolidays) {
    await prisma.holiday.upsert({
      where: { date: holiday.date },
      update: {
        name: holiday.name,
        isActive: true
      },
      create: {
        date: holiday.date,
        name: holiday.name,
        isActive: true
      }
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
