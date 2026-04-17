import mongoose from 'mongoose';

const fileDocSchema = new mongoose.Schema({
  path: String,
  language: String,
  moduleType: String,
  purpose: String,
  lineCount: Number,
  imports: [String],
  exportCount: Number,
  hasDefaultExport: Boolean,
  functions: [{ name: String, description: String, params: [String], hasReturn: Boolean }]
}, { _id: false });

const projectSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  source: { type: String, enum: ['github', 'paste', 'upload'], required: true },
  repoUrl: String,
  readme: { type: String, default: '' },
  fileDocs: [fileDocSchema],
  rawCode: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

projectSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Project', projectSchema);
