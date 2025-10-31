/// <reference types="jest" />
import {
  getDayOfWeek,
  getTimeString,
  timeToMinutes,
  isTimeInRange,
  DayOfWeek,
  validateOrderTime,
  validateChatTime,
} from '@/lib/scheduleValidation'
import { prisma } from '@/lib/prisma'

// Mock prisma client with nested structure for orderSchedule and chatSchedule
jest.mock('@/lib/prisma', () => ({
  prisma: {
    orderSchedule: {
      findFirst: jest.fn()
    },
    chatSchedule: {
      findFirst: jest.fn()
    }
  }
}))

// Mock logger to avoid console output
jest.mock('@/lib/logger', () => {
  const mockLogger = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
  return {
    __esModule: true,
    default: mockLogger,
    logger: mockLogger,
    LogCategory: {
      VALIDATION: 'VALIDATION',
    },
  }
})

describe('scheduleValidation - Time Helpers', () => {
  describe('getDayOfWeek', () => {
    it('should return SUNDAY for Sunday date', () => {
      // 2024-01-07 is a Sunday
      const date = new Date('2024-01-07T12:00:00')
      expect(getDayOfWeek(date)).toBe('SUNDAY')
    })

    it('should return MONDAY for Monday date', () => {
      // 2024-01-08 is a Monday
      const date = new Date('2024-01-08T12:00:00')
      expect(getDayOfWeek(date)).toBe('MONDAY')
    })

    it('should return TUESDAY for Tuesday date', () => {
      // 2024-01-09 is a Tuesday
      const date = new Date('2024-01-09T12:00:00')
      expect(getDayOfWeek(date)).toBe('TUESDAY')
    })

    it('should return WEDNESDAY for Wednesday date', () => {
      // 2024-01-10 is a Wednesday
      const date = new Date('2024-01-10T12:00:00')
      expect(getDayOfWeek(date)).toBe('WEDNESDAY')
    })

    it('should return THURSDAY for Thursday date', () => {
      // 2024-01-11 is a Thursday
      const date = new Date('2024-01-11T12:00:00')
      expect(getDayOfWeek(date)).toBe('THURSDAY')
    })

    it('should return FRIDAY for Friday date', () => {
      // 2024-01-12 is a Friday
      const date = new Date('2024-01-12T12:00:00')
      expect(getDayOfWeek(date)).toBe('FRIDAY')
    })

    it('should return SATURDAY for Saturday date', () => {
      // 2024-01-13 is a Saturday
      const date = new Date('2024-01-13T12:00:00')
      expect(getDayOfWeek(date)).toBe('SATURDAY')
    })

    it('should return a valid DayOfWeek when called without arguments', () => {
      const result = getDayOfWeek()
      const validDays: DayOfWeek[] = [
        'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 
        'THURSDAY', 'FRIDAY', 'SATURDAY'
      ]
      expect(validDays).toContain(result)
    })
  })

  describe('getTimeString', () => {
    it('should return correct time string for morning time', () => {
      const date = new Date('2024-01-01T09:30:00')
      expect(getTimeString(date)).toBe('09:30')
    })

    it('should return correct time string for afternoon time', () => {
      const date = new Date('2024-01-01T14:45:00')
      expect(getTimeString(date)).toBe('14:45')
    })

    it('should return correct time string for midnight', () => {
      const date = new Date('2024-01-01T00:00:00')
      expect(getTimeString(date)).toBe('00:00')
    })

    it('should return correct time string for one minute before midnight', () => {
      const date = new Date('2024-01-01T23:59:00')
      expect(getTimeString(date)).toBe('23:59')
    })

    it('should pad single digit hours with zero', () => {
      const date = new Date('2024-01-01T03:05:00')
      expect(getTimeString(date)).toBe('03:05')
    })

    it('should pad single digit minutes with zero', () => {
      const date = new Date('2024-01-01T15:07:00')
      expect(getTimeString(date)).toBe('15:07')
    })

    it('should return a valid time string when called without arguments', () => {
      const result = getTimeString()
      expect(result).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  describe('timeToMinutes', () => {
    it('should convert midnight to 0 minutes', () => {
      expect(timeToMinutes('00:00')).toBe(0)
    })

    it('should convert 1:00 AM to 60 minutes', () => {
      expect(timeToMinutes('01:00')).toBe(60)
    })

    it('should convert 12:00 PM to 720 minutes', () => {
      expect(timeToMinutes('12:00')).toBe(720)
    })

    it('should convert 23:59 to 1439 minutes', () => {
      expect(timeToMinutes('23:59')).toBe(1439)
    })

    it('should handle time with minutes correctly', () => {
      expect(timeToMinutes('09:30')).toBe(570) // 9*60 + 30
    })

    it('should handle time with different minute values', () => {
      expect(timeToMinutes('14:45')).toBe(885) // 14*60 + 45
    })

    it('should handle single digit hours', () => {
      expect(timeToMinutes('5:15')).toBe(315) // 5*60 + 15
    })

    it('should handle single digit minutes', () => {
      expect(timeToMinutes('10:5')).toBe(605) // 10*60 + 5
    })
  })

  describe('isTimeInRange', () => {
    it('should return true when current time is exactly at start time', () => {
      expect(isTimeInRange('09:00', '09:00', '17:00')).toBe(true)
    })

    it('should return true when current time is exactly at end time', () => {
      expect(isTimeInRange('17:00', '09:00', '17:00')).toBe(true)
    })

    it('should return true when current time is between start and end', () => {
      expect(isTimeInRange('12:00', '09:00', '17:00')).toBe(true)
    })

    it('should return false when current time is before start time', () => {
      expect(isTimeInRange('08:30', '09:00', '17:00')).toBe(false)
    })

    it('should return false when current time is after end time', () => {
      expect(isTimeInRange('18:00', '09:00', '17:00')).toBe(false)
    })

    it('should handle edge case - one minute before start', () => {
      expect(isTimeInRange('08:59', '09:00', '17:00')).toBe(false)
    })

    it('should handle edge case - one minute after end', () => {
      expect(isTimeInRange('17:01', '09:00', '17:00')).toBe(false)
    })

    it('should handle midnight ranges correctly', () => {
      expect(isTimeInRange('00:30', '00:00', '06:00')).toBe(true)
    })

    it('should handle late night ranges correctly', () => {
      expect(isTimeInRange('23:30', '22:00', '23:59')).toBe(true)
    })

    it('should handle full day range', () => {
      expect(isTimeInRange('12:00', '00:00', '23:59')).toBe(true)
    })

    it('should handle narrow time window', () => {
      expect(isTimeInRange('10:15', '10:00', '10:30')).toBe(true)
      expect(isTimeInRange('10:31', '10:00', '10:30')).toBe(false)
    })

    it('should handle lunch break scenario', () => {
      // Before lunch: 09:00-13:00
      expect(isTimeInRange('11:00', '09:00', '13:00')).toBe(true)
      // After lunch: 14:00-18:00
      expect(isTimeInRange('15:00', '14:00', '18:00')).toBe(true)
      // During lunch: should be false for both ranges
      expect(isTimeInRange('13:30', '09:00', '13:00')).toBe(false)
      expect(isTimeInRange('13:30', '14:00', '18:00')).toBe(false)
    })
  })

  describe('Time conversion consistency', () => {
    it('should maintain consistency between getTimeString and timeToMinutes', () => {
      const date = new Date('2024-01-01T14:30:00')
      const timeString = getTimeString(date)
      const minutes = timeToMinutes(timeString)
      
      expect(timeString).toBe('14:30')
      expect(minutes).toBe(870) // 14*60 + 30
    })

    it('should correctly identify business hours', () => {
      const businessStart = '09:00'
      const businessEnd = '18:00'
      
      // Before business hours
      expect(isTimeInRange('08:00', businessStart, businessEnd)).toBe(false)
      
      // During business hours
      expect(isTimeInRange('12:00', businessStart, businessEnd)).toBe(true)
      
      // After business hours
      expect(isTimeInRange('19:00', businessStart, businessEnd)).toBe(false)
    })
  })

  describe('Edge cases and boundaries', () => {
    it('should handle same start and end time', () => {
      expect(isTimeInRange('10:00', '10:00', '10:00')).toBe(true)
      expect(isTimeInRange('10:01', '10:00', '10:00')).toBe(false)
      expect(isTimeInRange('09:59', '10:00', '10:00')).toBe(false)
    })

    it('should handle time comparison with different formats', () => {
      // Single vs double digit
      expect(timeToMinutes('9:00')).toBe(timeToMinutes('09:00'))
      expect(timeToMinutes('9:5')).toBe(timeToMinutes('09:05'))
    })

    it('should handle very early morning times', () => {
      expect(isTimeInRange('00:01', '00:00', '01:00')).toBe(true)
      expect(isTimeInRange('00:00', '00:00', '00:01')).toBe(true)
    })

    it('should handle very late night times', () => {
      expect(isTimeInRange('23:58', '23:00', '23:59')).toBe(true)
      expect(isTimeInRange('23:59', '23:00', '23:59')).toBe(true)
    })
  })
})

describe('scheduleValidation - Async Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateOrderTime', () => {
    it('should allow orders when no schedule is configured', async () => {
      (prisma.orderSchedule.findFirst as jest.Mock).mockResolvedValueOnce(null)

      const result = await validateOrderTime('seller-123')

      expect(result.isValid).toBe(true)
      expect(result.message).toContain('restricciones')
      expect(prisma.orderSchedule.findFirst).toHaveBeenCalledWith({
        where: {
          sellerId: 'seller-123',
          dayOfWeek: expect.any(String),
          isActive: true,
        },
      })
    })

    it('should allow orders within schedule time range', async () => {
      const mockSchedule = {
        id: 'schedule-1',
        sellerId: 'seller-123',
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '18:00',
        isActive: true,
      }

      ;(prisma.orderSchedule.findFirst as jest.Mock).mockResolvedValueOnce(mockSchedule)

      // Monday at 10:00 AM
      const testDate = new Date('2024-01-08T10:00:00')
      const result = await validateOrderTime('seller-123', testDate)

      expect(result.isValid).toBe(true)
      expect(result.schedule).toEqual({
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '18:00',
      })
    })

    it('should reject orders outside schedule time range', async () => {
      const mockSchedule = {
        id: 'schedule-1',
        sellerId: 'seller-123',
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '18:00',
        isActive: true,
      }

      ;(prisma.orderSchedule.findFirst as jest.Mock).mockResolvedValueOnce(mockSchedule)

      // Monday at 7:00 AM (before opening)
      const testDate = new Date('2024-01-08T07:00:00')
      const result = await validateOrderTime('seller-123', testDate)

      expect(result.isValid).toBe(false)
      expect(result.message).toContain('08:00')
      expect(result.message).toContain('18:00')
    })

    it('should reject orders after closing time', async () => {
      const mockSchedule = {
        id: 'schedule-1',
        sellerId: 'seller-123',
        dayOfWeek: 'TUESDAY',
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
      }

      ;(prisma.orderSchedule.findFirst as jest.Mock).mockResolvedValueOnce(mockSchedule)

      // Tuesday at 8:00 PM
      const testDate = new Date('2024-01-09T20:00:00')
      const result = await validateOrderTime('seller-123', testDate)

      expect(result.isValid).toBe(false)
      expect(result.schedule?.startTime).toBe('09:00')
      expect(result.schedule?.endTime).toBe('17:00')
    })

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed')
      ;(prisma.orderSchedule.findFirst as jest.Mock).mockRejectedValueOnce(dbError)

      const result = await validateOrderTime('seller-123')

      // On error, function allows orders by default (failsafe behavior)
      expect(result.isValid).toBe(true)
      expect(result.message).toContain('Error')
    })

    it('should use current time when no date provided', async () => {
      (prisma.orderSchedule.findFirst as jest.Mock).mockResolvedValueOnce(null)

      const result = await validateOrderTime('seller-456')

      expect(result.isValid).toBe(true)
      expect(prisma.orderSchedule.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sellerId: 'seller-456',
          }),
        })
      )
    })
  })

  describe('validateChatTime', () => {
    it('should allow chat when no schedule is configured', async () => {
      (prisma.chatSchedule.findFirst as jest.Mock).mockResolvedValueOnce(null)

      const result = await validateChatTime('seller-123')

      expect(result.isValid).toBe(true)
      expect(result.message).toContain('restricciones')
      expect(prisma.chatSchedule.findFirst).toHaveBeenCalledWith({
        where: {
          sellerId: 'seller-123',
          dayOfWeek: expect.any(String),
          isActive: true,
        },
      })
    })

    it('should allow chat within schedule time range', async () => {
      const mockSchedule = {
        id: 'chat-schedule-1',
        sellerId: 'seller-123',
        dayOfWeek: 'WEDNESDAY',
        startTime: '09:00',
        endTime: '21:00',
        isActive: true,
      }

      ;(prisma.chatSchedule.findFirst as jest.Mock).mockResolvedValueOnce(mockSchedule)

      // Wednesday at 3:00 PM
      const testDate = new Date('2024-01-10T15:00:00')
      const result = await validateChatTime('seller-123', testDate)

      expect(result.isValid).toBe(true)
      expect(result.schedule).toEqual({
        dayOfWeek: 'WEDNESDAY',
        startTime: '09:00',
        endTime: '21:00',
      })
    })

    it('should reject chat outside schedule time range', async () => {
      const mockSchedule = {
        id: 'chat-schedule-1',
        sellerId: 'seller-123',
        dayOfWeek: 'THURSDAY',
        startTime: '10:00',
        endTime: '20:00',
        isActive: true,
      }

      ;(prisma.chatSchedule.findFirst as jest.Mock).mockResolvedValueOnce(mockSchedule)

      // Thursday at 9:00 AM (before opening)
      const testDate = new Date('2024-01-11T09:00:00')
      const result = await validateChatTime('seller-123', testDate)

      expect(result.isValid).toBe(false)
      expect(result.message).toContain('10:00')
      expect(result.message).toContain('20:00')
    })

    it('should reject chat after closing time', async () => {
      const mockSchedule = {
        id: 'chat-schedule-1',
        sellerId: 'seller-123',
        dayOfWeek: 'FRIDAY',
        startTime: '08:00',
        endTime: '18:00',
        isActive: true,
      }

      ;(prisma.chatSchedule.findFirst as jest.Mock).mockResolvedValueOnce(mockSchedule)

      // Friday at 9:00 PM
      const testDate = new Date('2024-01-12T21:00:00')
      const result = await validateChatTime('seller-123', testDate)

      expect(result.isValid).toBe(false)
      expect(result.schedule?.startTime).toBe('08:00')
      expect(result.schedule?.endTime).toBe('18:00')
    })

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Connection timeout')
      ;(prisma.chatSchedule.findFirst as jest.Mock).mockRejectedValueOnce(dbError)

      const result = await validateChatTime('seller-123')

      // On error, function allows chat by default (failsafe behavior)
      expect(result.isValid).toBe(true)
      expect(result.message).toContain('Error')
    })

    it('should work with exact boundary times - start time', async () => {
      const mockSchedule = {
        id: 'chat-schedule-1',
        sellerId: 'seller-123',
        dayOfWeek: 'SATURDAY',
        startTime: '10:00',
        endTime: '16:00',
        isActive: true,
      }

      ;(prisma.chatSchedule.findFirst as jest.Mock).mockResolvedValueOnce(mockSchedule)

      // Saturday at exactly 10:00 AM
      const testDate = new Date('2024-01-13T10:00:00')
      const result = await validateChatTime('seller-123', testDate)

      expect(result.isValid).toBe(true)
    })

    it('should work with exact boundary times - end time', async () => {
      const mockSchedule = {
        id: 'chat-schedule-1',
        sellerId: 'seller-123',
        dayOfWeek: 'SUNDAY',
        startTime: '11:00',
        endTime: '19:00',
        isActive: true,
      }

      ;(prisma.chatSchedule.findFirst as jest.Mock).mockResolvedValueOnce(mockSchedule)

      // Sunday at exactly 7:00 PM
      const testDate = new Date('2024-01-07T19:00:00')
      const result = await validateChatTime('seller-123', testDate)

      expect(result.isValid).toBe(true)
    })
  })
})
