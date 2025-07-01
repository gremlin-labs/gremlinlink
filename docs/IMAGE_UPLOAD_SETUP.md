# Image Upload Setup Guide

This guide will help you set up image upload functionality for GremlinLink using Digital Ocean Spaces.

## Prerequisites

1. **Digital Ocean Account**: You need a Digital Ocean account
2. **Digital Ocean Spaces**: Create a Space (similar to AWS S3 bucket)
3. **API Keys**: Generate Spaces access keys

## Step 1: Create Digital Ocean Space

1. Log into your Digital Ocean account
2. Navigate to **Spaces** in the sidebar
3. Click **Create a Space**
4. Choose your settings:
   - **Datacenter region**: Choose closest to your users (e.g., NYC3, SFO3)
   - **Space name**: Choose a unique name (e.g., `gremlinlink-images`)
   - **File listing**: Choose "Restrict File Listing" for security
   - **CDN**: Enable CDN for faster image delivery (optional but recommended)

## Step 2: Generate API Keys

1. Go to **API** in the Digital Ocean sidebar
2. Click **Spaces Keys** tab
3. Click **Generate New Key**
4. Give it a name (e.g., "GremlinLink Images")
5. Save the **Access Key** and **Secret Key** securely

## Step 3: Configure Environment Variables

Add these variables to your `.env` file:

```bash
# Digital Ocean Spaces Configuration
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com  # Replace with your region
DO_SPACES_REGION=nyc3                                   # Replace with your region
DO_SPACES_BUCKET=your-bucket-name                       # Replace with your Space name
DO_SPACES_KEY=your-spaces-access-key                    # Your Spaces access key
DO_SPACES_SECRET=your-spaces-secret-key                 # Your Spaces secret key
DO_SPACES_CDN_ENDPOINT=https://your-cdn-endpoint.com    # Optional: Your CDN endpoint
```

### Environment Variable Details

- **DO_SPACES_ENDPOINT**: The endpoint URL for your region
  - NYC3: `https://nyc3.digitaloceanspaces.com`
  - SFO3: `https://sfo3.digitaloceanspaces.com`
  - AMS3: `https://ams3.digitaloceanspaces.com`
  - SGP1: `https://sgp1.digitaloceanspaces.com`
  - FRA1: `https://fra1.digitaloceanspaces.com`

- **DO_SPACES_REGION**: The region code (nyc3, sfo3, ams3, sgp1, fra1)

- **DO_SPACES_BUCKET**: Your Space name (must be globally unique)

- **DO_SPACES_KEY**: Your Spaces access key (starts with `DO00`)

- **DO_SPACES_SECRET**: Your Spaces secret key

- **DO_SPACES_CDN_ENDPOINT**: (Optional) If you enabled CDN, use the CDN URL for faster delivery

## Step 4: Set Space Permissions

1. Go to your Space in the Digital Ocean dashboard
2. Click on **Settings** tab
3. Under **CORS (Cross Origin Resource Sharing)**, add:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

## Step 5: Test the Setup

1. Start your development server: `npm run dev`
2. Go to the admin panel: `http://localhost:3000/admin`
3. Create or edit a link
4. Try uploading an image
5. Check that the image appears in your Digital Ocean Space

## Features

### Image Upload
- **Supported formats**: JPEG, PNG, WebP, GIF
- **Maximum file size**: 5MB
- **Automatic resizing**: Images are stored at original size
- **Unique filenames**: Prevents conflicts with timestamp + random string

### Image Display
- **Admin panel**: Thumbnail previews in link list
- **Landing page**: Images displayed in link cards
- **Main page**: Images shown for default links
- **Fallback**: Icon or placeholder if no image

### Security
- **Authentication required**: Only authenticated admin users can upload
- **File validation**: Type and size validation on both client and server
- **Public read access**: Images are publicly accessible via URL
- **Secure upload**: Files uploaded server-side with validated credentials

## Troubleshooting

### Common Issues

1. **"Failed to upload image"**
   - Check your API keys are correct
   - Verify the Space name matches exactly
   - Ensure the endpoint URL is correct for your region

2. **"Access Denied"**
   - Verify your Spaces keys have the correct permissions
   - Check that the Space exists and is accessible

3. **"CORS Error"**
   - Add CORS configuration to your Space settings
   - Ensure your domain is allowed in CORS origins

4. **Images not displaying**
   - Check the image URL is accessible
   - Verify CDN endpoint if using CDN
   - Ensure images have public read permissions

### Testing Connectivity

You can test your Spaces configuration with this simple script:

```javascript
// Test in browser console or Node.js
const testSpaces = async () => {
  try {
    const response = await fetch('YOUR_SPACES_ENDPOINT/YOUR_BUCKET_NAME/');
    console.log('Spaces accessible:', response.status === 200);
  } catch (error) {
    console.error('Spaces connection failed:', error);
  }
};
```

## Cost Considerations

- **Storage**: $0.02 per GB per month
- **Bandwidth**: $0.01 per GB transferred
- **Requests**: $0.005 per 1,000 requests
- **CDN**: Additional $0.01 per GB (optional)

For a typical link management app with moderate image usage, costs are usually under $5/month.

## Security Best Practices

1. **Rotate keys regularly**: Change your Spaces keys periodically
2. **Restrict CORS**: Limit CORS origins to your specific domains in production
3. **Monitor usage**: Keep an eye on bandwidth and storage usage
4. **Backup important images**: Consider backing up critical images
5. **Use CDN**: Enable CDN for better performance and reduced origin load

## Alternative Storage Options

If you prefer not to use Digital Ocean Spaces, you can modify the storage utility to work with:

- **AWS S3**: Change the endpoint and credentials
- **Google Cloud Storage**: Modify the client configuration
- **Cloudflare R2**: Update the endpoint URL
- **Local storage**: For development/testing only

The storage interface in `src/lib/storage.ts` is designed to be easily adaptable to other S3-compatible services. 