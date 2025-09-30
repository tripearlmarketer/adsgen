import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'manager' | 'analyst';
  timezone: string;
  language: 'en' | 'ms';
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Generate JWT token
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await query(
    'SELECT id, email, name, role, timezone, language FROM users WHERE email = $1',
    [email]
  );
  
  return result.rows[0] || null;
}

// Get user by ID
export async function getUserById(id: string): Promise<User | null> {
  const result = await query(
    'SELECT id, email, name, role, timezone, language FROM users WHERE id = $1',
    [id]
  );
  
  return result.rows[0] || null;
}

// Create user
export async function createUser(userData: {
  email: string;
  name: string;
  password: string;
  role?: 'owner' | 'manager' | 'analyst';
  timezone?: string;
  language?: 'en' | 'ms';
}): Promise<User> {
  const passwordHash = await hashPassword(userData.password);
  
  const result = await query(
    `INSERT INTO users (email, name, password_hash, role, timezone, language)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, name, role, timezone, language`,
    [
      userData.email,
      userData.name,
      passwordHash,
      userData.role || 'analyst',
      userData.timezone || 'Asia/Kuala_Lumpur',
      userData.language || 'en'
    ]
  );
  
  return result.rows[0];
}

// Authenticate user
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const result = await query(
    'SELECT id, email, name, password_hash, role, timezone, language FROM users WHERE email = $1',
    [email]
  );
  
  const user = result.rows[0];
  if (!user) return null;
  
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) return null;
  
  // Return user without password hash
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Role-based access control
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    owner: 3,
    manager: 2,
    analyst: 1
  };
  
  return roleHierarchy[userRole as keyof typeof roleHierarchy] >= 
         roleHierarchy[requiredRole as keyof typeof roleHierarchy];
}

// Middleware for role checking
export function requireRole(requiredRole: 'owner' | 'manager' | 'analyst') {
  return (userRole: string) => {
    if (!hasPermission(userRole, requiredRole)) {
      throw new Error(`Insufficient permissions. Required: ${requiredRole}`);
    }
  };
}
