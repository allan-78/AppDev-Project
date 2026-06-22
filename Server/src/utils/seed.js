import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { Community } from "../models/Community.js";
import { User } from "../models/User.js";
import { Category } from "../models/Category.js";
import { Tool } from "../models/Tool.js";

async function seed() {
  await connectDB();
  await Promise.all([Community.deleteMany({}), User.deleteMany({}), Category.deleteMany({}), Tool.deleteMany({})]);

  const community = await Community.create({
    name: "Greenfield Subdivision",
    location: "Sample Barangay",
    joinCode: "GREEN123"
  });

  const passwordHash = await bcrypt.hash("Password123!", 12);
  const admin = await User.create({
    fullName: "Community Admin",
    email: "admin@neighborhood.test",
    passwordHash,
    phone: "09170000000",
    address: "Clubhouse Office",
    role: "admin",
    status: "approved",
    community: community._id,
    trustPoints: 150
  });

  const resident = await User.create({
    fullName: "Maria Santos",
    email: "resident@neighborhood.test",
    passwordHash,
    phone: "09171112222",
    address: "Block 4 Lot 8",
    role: "resident",
    status: "approved",
    community: community._id,
    trustPoints: 110
  });

  community.createdBy = admin._id;
  await community.save();

  const categories = await Category.insertMany([
    { name: "Garden", icon: "leaf", community: community._id },
    { name: "Cleaning", icon: "sparkles", community: community._id },
    { name: "Construction", icon: "hammer", community: community._id }
  ]);

  await Tool.insertMany([
    {
      name: "Electric Lawn Mower",
      description: "Quiet mower for small to medium lawns.",
      category: categories[0]._id,
      owner: resident._id,
      community: community._id,
      condition: "good",
      depositPoints: 12,
      images: [{ url: "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=900", label: "listing", uploadedBy: resident._id }]
    },
    {
      name: "Pressure Washer",
      description: "High-pressure washer for driveways and gates.",
      category: categories[1]._id,
      owner: resident._id,
      community: community._id,
      condition: "excellent",
      depositPoints: 15,
      images: [{ url: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=900", label: "listing", uploadedBy: resident._id }]
    }
  ]);

  console.log("Seed complete");
  console.log("Admin: admin@neighborhood.test / Password123!");
  console.log("Resident: resident@neighborhood.test / Password123!");
  console.log("Join code: GREEN123");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
