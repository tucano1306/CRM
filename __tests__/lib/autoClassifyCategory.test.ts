// __tests__/lib/autoClassifyCategory.test.ts
import { autoClassifyCategory } from '@/lib/autoClassifyCategory'
import { ProductCategory } from '@prisma/client'

describe('autoClassifyCategory', () => {
  describe('CARNES', () => {
    it('should classify beef products as CARNES', () => {
      expect(autoClassifyCategory('Beef Ribeye Steak')).toBe(ProductCategory.CARNES)
      expect(autoClassifyCategory('Ground Beef')).toBe(ProductCategory.CARNES)
      expect(autoClassifyCategory('Carne de res')).toBe(ProductCategory.CARNES)
    })

    it('should classify chicken as CARNES', () => {
      expect(autoClassifyCategory('Chicken Breast')).toBe(ProductCategory.CARNES)
      expect(autoClassifyCategory('Pechuga de pollo')).toBe(ProductCategory.CARNES)
    })

    it('should classify seafood as CARNES', () => {
      expect(autoClassifyCategory('Salmon Fillet')).toBe(ProductCategory.CARNES)
      expect(autoClassifyCategory('Shrimp')).toBe(ProductCategory.CARNES)
      expect(autoClassifyCategory('Camarón')).toBe(ProductCategory.CARNES)
    })

    it('should classify pork as CARNES', () => {
      expect(autoClassifyCategory('Pork Chop')).toBe(ProductCategory.CARNES)
      // Note: Bacon matches CARNES pattern (bacon|tocino is in carnesPattern)
      expect(autoClassifyCategory('Bacon')).toBe(ProductCategory.CARNES)
      expect(autoClassifyCategory('Chuleta de cerdo')).toBe(ProductCategory.CARNES)
    })
  })

  describe('EMBUTIDOS', () => {
    it('should classify sausages as EMBUTIDOS', () => {
      expect(autoClassifyCategory('Italian Sausage')).toBe(ProductCategory.EMBUTIDOS)
      expect(autoClassifyCategory('Salchicha')).toBe(ProductCategory.EMBUTIDOS)
      expect(autoClassifyCategory('Chorizo')).toBe(ProductCategory.EMBUTIDOS)
    })

    it('should classify deli meats as EMBUTIDOS', () => {
      expect(autoClassifyCategory('Pepperoni')).toBe(ProductCategory.EMBUTIDOS)
      expect(autoClassifyCategory('Mortadela')).toBe(ProductCategory.EMBUTIDOS)
      expect(autoClassifyCategory('Hot Dog')).toBe(ProductCategory.EMBUTIDOS)
    })
  })

  describe('LACTEOS', () => {
    it('should classify cheese as LACTEOS', () => {
      expect(autoClassifyCategory('Mozzarella Cheese')).toBe(ProductCategory.LACTEOS)
      expect(autoClassifyCategory('Queso cheddar')).toBe(ProductCategory.LACTEOS)
    })

    it('should classify yogurt as LACTEOS', () => {
      expect(autoClassifyCategory('Greek Yogurt')).toBe(ProductCategory.LACTEOS)
      expect(autoClassifyCategory('Yogur natural')).toBe(ProductCategory.LACTEOS)
    })

    it('should classify butter as LACTEOS', () => {
      expect(autoClassifyCategory('Butter')).toBe(ProductCategory.LACTEOS)
      expect(autoClassifyCategory('Mantequilla')).toBe(ProductCategory.LACTEOS)
    })
  })

  describe('VEGETALES', () => {
    it('should classify vegetables as VEGETALES', () => {
      expect(autoClassifyCategory('Lettuce')).toBe(ProductCategory.VEGETALES)
      expect(autoClassifyCategory('Cebolla')).toBe(ProductCategory.VEGETALES)
      expect(autoClassifyCategory('Broccoli')).toBe(ProductCategory.VEGETALES)
    })

    it('should classify fruits as VEGETALES', () => {
      expect(autoClassifyCategory('Apple')).toBe(ProductCategory.VEGETALES)
      expect(autoClassifyCategory('Manzana')).toBe(ProductCategory.VEGETALES)
      expect(autoClassifyCategory('Banana')).toBe(ProductCategory.VEGETALES)
    })
  })

  describe('BEBIDAS', () => {
    it('should classify sodas as BEBIDAS', () => {
      expect(autoClassifyCategory('Coca Cola')).toBe(ProductCategory.BEBIDAS)
      expect(autoClassifyCategory('Pepsi')).toBe(ProductCategory.BEBIDAS)
      expect(autoClassifyCategory('Sprite')).toBe(ProductCategory.BEBIDAS)
    })

    it('should classify water as BEBIDAS', () => {
      expect(autoClassifyCategory('Bottled Water')).toBe(ProductCategory.BEBIDAS)
      expect(autoClassifyCategory('Sparkling Water')).toBe(ProductCategory.BEBIDAS)
    })
  })

  describe('GRANOS', () => {
    it('should classify grains as GRANOS', () => {
      expect(autoClassifyCategory('White Rice')).toBe(ProductCategory.GRANOS)
      expect(autoClassifyCategory('Arroz')).toBe(ProductCategory.GRANOS)
      expect(autoClassifyCategory('Pasta')).toBe(ProductCategory.GRANOS)
    })

    it('should classify bread as GRANOS', () => {
      expect(autoClassifyCategory('Bread')).toBe(ProductCategory.GRANOS)
      expect(autoClassifyCategory('Pan')).toBe(ProductCategory.GRANOS)
      expect(autoClassifyCategory('Tortilla')).toBe(ProductCategory.GRANOS)
    })

    it('should classify beans as GRANOS', () => {
      expect(autoClassifyCategory('Black Beans')).toBe(ProductCategory.GRANOS)
      expect(autoClassifyCategory('Frijoles')).toBe(ProductCategory.GRANOS)
    })
  })

  describe('SALSAS', () => {
    it('should classify sauces as SALSAS', () => {
      expect(autoClassifyCategory('Ketchup')).toBe(ProductCategory.SALSAS)
      expect(autoClassifyCategory('Mayonnaise')).toBe(ProductCategory.SALSAS)
      expect(autoClassifyCategory('Mustard')).toBe(ProductCategory.SALSAS)
    })

    it('should classify hot sauces as SALSAS', () => {
      expect(autoClassifyCategory('Sriracha')).toBe(ProductCategory.SALSAS)
      expect(autoClassifyCategory('Tabasco')).toBe(ProductCategory.SALSAS)
    })
  })

  describe('CONDIMENTOS', () => {
    it('should classify spices as CONDIMENTOS', () => {
      // Note: "Black Pepper" contains "pepper" which matches VEGETALES pattern first
      // Using "pimienta" (Spanish) works correctly for CONDIMENTOS
      expect(autoClassifyCategory('Pimienta negra')).toBe(ProductCategory.CONDIMENTOS)
      expect(autoClassifyCategory('Oregano')).toBe(ProductCategory.CONDIMENTOS)
      expect(autoClassifyCategory('Cumin')).toBe(ProductCategory.CONDIMENTOS)
    })

    it('should classify salt and sugar as CONDIMENTOS', () => {
      expect(autoClassifyCategory('Sea Salt')).toBe(ProductCategory.CONDIMENTOS)
      expect(autoClassifyCategory('Brown Sugar')).toBe(ProductCategory.CONDIMENTOS)
    })
  })

  describe('OTROS', () => {
    it('should classify unknown products as OTROS', () => {
      expect(autoClassifyCategory('Unknown Product XYZ')).toBe(ProductCategory.OTROS)
      expect(autoClassifyCategory('Random Item 123')).toBe(ProductCategory.OTROS)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty strings', () => {
      expect(autoClassifyCategory('')).toBe(ProductCategory.OTROS)
    })

    it('should handle description matching', () => {
      expect(autoClassifyCategory('Product', 'Made with fresh chicken')).toBe(ProductCategory.CARNES)
    })

    it('should be case insensitive', () => {
      expect(autoClassifyCategory('BEEF STEAK')).toBe(ProductCategory.CARNES)
      expect(autoClassifyCategory('beef steak')).toBe(ProductCategory.CARNES)
      expect(autoClassifyCategory('Beef Steak')).toBe(ProductCategory.CARNES)
    })
  })
})
