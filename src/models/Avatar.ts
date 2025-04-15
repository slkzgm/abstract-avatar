// src/models/Avatar.ts
import { Schema, model, models } from 'mongoose'

interface Avatar {
  tokenId: number
  imageUrl: string
}

const avatarSchema = new Schema<Avatar>({
  tokenId: { type: Number, required: true, unique: true },
  imageUrl: { type: String, required: true },
})

export default models.Avatar || model<Avatar>('Avatar', avatarSchema)
