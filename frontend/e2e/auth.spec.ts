import { test, expect } from '@playwright/test'
import { uniqueEmail, register, login } from './helpers'

test.describe('Authentication', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('register creates an account and lands on dashboard', async ({ page }) => {
    const email = uniqueEmail()
    await register(page, email)

    await expect(page).toHaveURL('/')
    await expect(page.getByText(email)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'My Tasks' })).toBeVisible()
  })

  test('register with duplicate email shows an error', async ({ page }) => {
    const email = uniqueEmail()
    await register(page, email)
    await page.getByText('Sign out').click()

    await page.goto('/register')
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByPlaceholder('min 8 characters').fill('testpass123')
    await page.getByRole('button', { name: 'Create account' }).click()

    // Should stay on register and show a toast error
    await expect(page).toHaveURL(/\/register/)
    await expect(page.getByText(/already in use|failed/i)).toBeVisible()
  })

  test('register with short password shows validation error', async ({ page }) => {
    await page.goto('/register')
    await page.getByPlaceholder('you@example.com').fill(uniqueEmail())
    await page.getByPlaceholder('min 8 characters').fill('short')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible()
  })

  test('login with valid credentials lands on dashboard', async ({ page }) => {
    const email = uniqueEmail()
    await register(page, email)
    await page.getByText('Sign out').click()

    await login(page, email)

    await expect(page).toHaveURL('/')
    await expect(page.getByText(email)).toBeVisible()
  })

  test('login with wrong password shows error toast', async ({ page }) => {
    const email = uniqueEmail()
    await register(page, email)
    await page.getByText('Sign out').click()

    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByPlaceholder('••••••••').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // BCrypt verification adds latency — allow extra time for the toast
    await expect(page.getByText('Invalid email or password')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('logout clears session and redirects to /login', async ({ page }) => {
    await register(page, uniqueEmail())
    await page.getByText('Sign out').click()

    await expect(page).toHaveURL(/\/login/)

    // Navigating to / should redirect back to login
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('authenticated users are redirected away from /login', async ({ page }) => {
    await register(page, uniqueEmail())
    await page.goto('/login')
    await expect(page).toHaveURL('/')
  })
})
