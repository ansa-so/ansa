# 📎 Paperclip: Document Attachment System

Paperclip is Ansa's comprehensive document attachment system that enables customers to upload files during chat conversations with AI agents. This system provides secure file handling, rich UI feedback, and analytics tracking.

## 🎯 Overview

The Paperclip system allows customers to:
- Upload files (images, PDFs, Word documents, text files) during chat conversations
- View uploaded files with rich type-specific icons and metadata
- Download previously uploaded attachments securely
- Receive real-time feedback on upload progress and errors

## 🏗️ Architecture

### Components

1. **Database Layer** (`packages/db/src/schema.ts`)
   - `attachments` table with file metadata
   - Linked to `chatMessages` via foreign key relationship

2. **API Layer** (`apps/api/src/routes/attachments.ts`)
   - RESTful endpoints for CRUD operations
   - Built-in analytics tracking
   - Security validation and access control

3. **Widget Layer** (`apps/widget/src/Widget.tsx`)
   - Paperclip button in message input
   - Rich file upload UI with progress feedback
   - Enhanced message display for attachments

## 📡 API Endpoints

### Upload Attachment
```http
POST /attachments
Content-Type: multipart/form-data

{
  "file": File,
  "messageId": "uuid"
}
```

**Response:**
```json
{
  "id": "attachment-uuid",
  "filename": "document.pdf",
  "contentType": "application/pdf",
  "fileSize": 1024768,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Get Message Attachments
```http
GET /attachments/message/{messageId}
```

**Response:**
```json
[
  {
    "id": "attachment-uuid",
    "filename": "screenshot.png",
    "contentType": "image/png",
    "fileSize": 256789,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### Download Attachment
```http
GET /attachments/{attachmentId}
```

**Response:** Binary file with proper headers:
- `Content-Type`: Original file MIME type
- `Content-Disposition`: `attachment; filename="original-name.ext"`
- `Content-Length`: File size in bytes

### Delete Attachment
```http
DELETE /attachments/{attachmentId}
```

**Response:**
```json
{
  "deleted": true
}
```

## 🔒 Security

### Authentication
- All endpoints require user authentication via session/cookie
- Only message owners can manage attachments for their conversations

### File Validation
- **Size Limit**: 10MB maximum per file
- **Allowed Types**:
  - Images: JPEG, PNG, GIF, WebP
  - Documents: PDF, DOC, DOCX, TXT
- **Path Security**: Files stored with UUID names to prevent directory traversal

### Access Control
- Users can only access attachments from their own conversations
- Proper verification of message ownership before file operations

## 📊 Analytics Tracking

The system tracks the following events:

### Upload Events
```typescript
// Successful upload
{
  event: "upload_success",
  userId: "user-uuid",
  messageId: "message-uuid",
  attachmentId: "attachment-uuid",
  fileName: "document.pdf",
  fileType: "application/pdf",
  fileSize: 1024768,
  contentCategory: "application"
}

// Failed upload
{
  event: "upload_failed",
  userId: "user-uuid",
  messageId: "message-uuid",
  reason: "file_too_large" | "invalid_file_type",
  fileSize: 15728640,
  fileName: "large-file.pdf"
}
```

### Download Events
```typescript
{
  event: "download_success",
  userId: "user-uuid",
  attachmentId: "attachment-uuid",
  fileName: "document.pdf",
  fileType: "application/pdf",
  fileSize: 1024768
}
```

### View Events
```typescript
{
  event: "attachments_viewed",
  userId: "user-uuid",
  messageId: "message-uuid",
  attachmentCount: 3
}
```

## 🎨 UI Components

### Paperclip Button
- Located between message input and send button
- Disabled when no conversation is active or during loading
- Tooltip: "Attach file (images, PDFs, documents)"
- Opens native file picker on click

### File Upload Feedback
```tsx
// Enhanced attachment display in user messages
{msg.metadata?.attachmentUpload && (
  <div className="attachment-card">
    <FileTypeIcon type={file.type} />
    <div className="file-info">
      <span className="filename">{file.name}</span>
      <span className="file-size">{file.size}KB</span>
      <span className="file-type">{file.type}</span>
    </div>
    <StatusIndicator
      error={msg.metadata.uploadError}
      success={msg.metadata.attachmentId}
      loading={!msg.metadata.uploadError && !msg.metadata.attachmentId}
    />
  </div>
)}
```

### File Type Icons
- **Images**: Blue image icon
- **PDFs**: Red PDF icon
- **Word Documents**: Blue document icon
- **Text Files**: Gray document icon

## ⚙️ Configuration

### Environment Variables
```bash
# File storage directory (defaults to ./uploads/attachments)
UPLOADS_DIR=/path/to/uploads/attachments

# Maximum file size in bytes (defaults to 10MB)
MAX_ATTACHMENT_SIZE=10485760
```

### Database Setup
```sql
-- Ensure attachments table exists
-- This is handled automatically by Drizzle migrations
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

## 🚀 Deployment

### File Storage Requirements
1. **Directory Permissions**: Ensure write access to `UPLOADS_DIR`
2. **Disk Space**: Monitor available space for file uploads
3. **Backup Strategy**: Include uploaded files in backup procedures

### Performance Considerations
1. **CDN Integration**: Consider serving files through CDN for better performance
2. **Cleanup Jobs**: Implement periodic cleanup of orphaned files
3. **Monitoring**: Track file system usage and API response times

### Security Checklist
- [ ] Configure proper file system permissions
- [ ] Set up virus scanning for uploaded files (optional)
- [ ] Monitor for unusual upload patterns
- [ ] Implement rate limiting for upload endpoints
- [ ] Regularly audit file storage directory

## 🔧 Development

### Testing File Uploads
```bash
# Test upload endpoint
curl -X POST http://localhost:3001/attachments \
  -H "Cookie: session=your-session-cookie" \
  -F "file=@test-document.pdf" \
  -F "messageId=message-uuid-here"

# Test download endpoint
curl -X GET http://localhost:3001/attachments/attachment-uuid \
  -H "Cookie: session=your-session-cookie" \
  --output downloaded-file.pdf
```

### Widget Integration
```typescript
// Handle file upload in custom implementations
const handleFileUpload = async (file: File, messageId: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('messageId', messageId);

  const response = await fetch('/api/attachments', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return await response.json();
};
```

## 🐛 Troubleshooting

### Common Issues

1. **"File too large" errors**
   - Check `MAX_ATTACHMENT_SIZE` environment variable
   - Verify nginx/proxy upload size limits

2. **"Upload failed" errors**
   - Check file system permissions on `UPLOADS_DIR`
   - Verify available disk space
   - Check application logs for detailed error messages

3. **Download failures**
   - Verify file exists in storage directory
   - Check user permissions for the specific attachment
   - Ensure proper session authentication

### Debug Mode
Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will log detailed information about file operations and analytics events.

## 📈 Metrics & Monitoring

### Key Metrics to Track
- Upload success/failure rates
- Average file sizes by type
- Most common file types
- Download frequency
- Storage usage over time

### Analytics Integration
The system includes built-in analytics tracking that can be extended with:
- PostHog integration for user behavior analytics
- Custom metrics database for business intelligence
- Real-time monitoring dashboards

## 🔄 Future Enhancements

### Potential Features
- [ ] Image thumbnail generation
- [ ] File preview in chat (for images/PDFs)
- [ ] Drag-and-drop upload interface
- [ ] Multiple file upload support
- [ ] File compression for large uploads
- [ ] Integration with cloud storage (S3, GCS)
- [ ] Virus scanning integration
- [ ] Advanced file type support (videos, archives)

---

**The Paperclip system is now fully operational and ready to enhance customer support conversations with seamless file attachment capabilities!** 📎✨