import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function UserInfo() {
  const { user } = useUser()

  if (!user) return null

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Información del Usuario</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p><strong>Nombre:</strong> {user.fullName}</p>
          <p><strong>Email:</strong> {user.primaryEmailAddress?.emailAddress}</p>
          <p><strong>ID:</strong> {user.id}</p>
        </div>
      </CardContent>
    </Card>
  )
}