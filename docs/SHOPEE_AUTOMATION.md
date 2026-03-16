# Shopee Automation

Complete integration guide for Shopee affiliate product discovery and Pinterest video automation.

## Overview

The Shopee automation system enables:
- Automated product discovery from Shopee API
- Video generation with AI-powered enhancements
- Pinterest content creation and optimization
- User review workflow before posting

## Architecture

```
API (GET /v1/shopee/products, POST /v1/shopee/video-content)
  ↓
ShopeeClient (Product discovery & details)
  ↓
Worker Queue (shopee_video_processing)
  ↓
Video Engine + Pinterest Engine
  ↓
Database (shopeeVideoContent)
  ↓
User Dashboard (Review & Approve)
```

## Configuration

### Environment Variables

```bash
# Shopee API Credentials
SHOPEE_APP_ID=your_shopee_app_id
SHOPEE_SECRET_KEY=your_shopee_secret_key
SHOPEE_AFFILIATE_ID=your_affiliate_id
SHOPEE_API_BASE_URL=https://partner.shopeemobile.com/api/v2

# Required for video processing
OPENAI_API_KEY=sk-...
```

### Setup Steps

1. Register with [Shopee Affiliate Program](https://seller.shopee.com/affiliation)
2. Create API credentials in Shopee Partner Portal
3. Set environment variables in `.env`
4. Ensure Redis is running for job queue

## API Endpoints

### 1. Discover Products

**GET** `/v1/shopee/products`

Returns high-commission Shopee products matching filters.

**Request:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.adsamazing.com/v1/shopee/products
```

**Response:**
```json
{
  "products": [
    {
      "itemId": "12345678",
      "shopId": "987654",
      "name": "Premium Headphones",
      "price": 299.99,
      "rating": 4.8,
      "sales": 1250,
      "commission": 18,
      "category": "Electronics",
      "videoUrls": ["https://..."],
      "affiliateLink": "https://..."
    }
  ],
  "count": 25
}
```

### 2. Create Video Content

**POST** `/v1/shopee/video-content`

Queues video processing and Pinterest content generation.

**Request:**
```json
{
  "shopId": "987654",
  "itemId": "12345678",
  "videoUrl": "https://shopee-cdn.com/video.mp4"
}
```

**Response:**
```json
{
  "jobId": "987654:12345678:1234567890",
  "status": "queued"
}
```

## Video Processing Pipeline

### Step 1: Download & Extract Audio
- Downloads video from Shopee CDN
- Extracts audio track via FFmpeg

### Step 2: Music Selection
- Selects genre-appropriate background music
- Matches product category (electronics, fashion, etc.)

### Step 3: Video Editing
- Adds Portuguese call-to-action overlay
- Optimizes for Pinterest dimensions (1000x1500)
- Applies auto-captions via OpenAI Whisper
- Encodes to MP4 format

### Step 4: Pinterest Content Generation
- Generates optimized pin title (100 chars max)
- Creates description with emojis and hashtags
- Formats for user review

### Step 5: Save & Review
- Stores video and metadata in database
- Marks as "ready_for_pinterest"
- Notifies user for approval

## Database Schema

### ShopeeVideoContent Table

```prisma
model ShopeeVideoContent {
  id                String
  userId            String
  shopeeProductId   String
  videoPath         String
  pinterestMetadata Json
  status            String     // ready_for_pinterest, approved, posted
  createdAt         DateTime
  updatedAt         DateTime
}
```

## Pinterest Content Format

Generated content includes:

**Title (100 chars max):**
```
Premium Headphones | Melhor Preço + Frete Rápido 🚀
```

**Description:**
```
🔥 Premium Headphones
💰 R$ 299.99
⭐ 4.8/5 (1250 vendas/mês)
📦 Shopee
✅ Comissão: 18%

Clique no link da bio para comprar!
Melhor tecnologia, melhor preço. Entrega rápida!

#Tecnologia #Electronics #Shopee #Promoção #Oferta
```

**CTA Button:** "🛒 Comprar Agora"

**Hashtags:**
- `#Tecnologia`
- `#[Category]`
- `#Shopee`
- `#Promoção`
- `#Oferta`
- `#MelhorPreço`
- `#AfilidoShopee`
- `#[ProductName]`

## Workflow

### User Perspective

1. **Discover Products**
   - User calls `/v1/shopee/products`
   - System returns top 25 products
   - User selects product to create content

2. **Create Video Content**
   - User calls `/v1/shopee/video-content`
   - System queues processing job
   - User receives job ID for status tracking

3. **Review Content**
   - User waits for job completion (~5-10 minutes)
   - Dashboard displays video preview
   - User reviews title, description, hashtags
   - User approves or rejects

4. **Post to Pinterest**
   - Upon approval, content posted to Pinterest
   - Link tracked for affiliate conversions
   - Metrics updated in analytics dashboard

### Behind the Scenes

1. **Job Queue (BullMQ)**
   - Worker picks up `shopee_video_processing` job
   - Downloads video from Shopee
   - Processes in temporary directory

2. **Video Engine**
   - FFmpeg extracts audio
   - Music selection via category mapping
   - AI captions generation
   - Video encoding

3. **Pinterest Engine**
   - Sanitizes product name
   - Formats description with emojis
   - Generates hashtags
   - Creates review format

4. **Database**
   - Saves processed video path
   - Stores Pinterest metadata
   - Records timestamp and status

## Error Handling

### Failed Jobs

Failed jobs are stored in `queueDeadLetter` table with:
- Queue name
- External job ID
- Original payload
- Error message
- Timestamp

### Retry Strategy

- **Attempts:** 3
- **Backoff:** Exponential (5s initial delay)
- **Max Delay:** 5 seconds × 3 = max 15 seconds per retry

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| MISSING_CREDENTIALS | Shopee API keys not set | Set `SHOPEE_APP_ID` and `SHOPEE_SECRET_KEY` |
| Video download fails | Network issue | Check Shopee CDN availability |
| Caption generation slow | OpenAI API rate limit | Reduce batch size or wait |
| File permissions | FFmpeg can't write temp | Check `/tmp` directory permissions |

## Development

### Local Testing

```bash
# Start worker
npm run worker

# Call API
curl -X POST http://localhost:3000/v1/shopee/video-content \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "987654",
    "itemId": "12345678"
  }'
```

### Debug Logging

Worker logs with:
- `logger.info()` - Major milestones
- `logger.debug()` - API calls
- `logger.error()` - Failures

Set `NODE_ENV=development` for verbose logs.

## Performance

### Expected Timings

- **Product Discovery:** 2-3 seconds
- **Video Download:** 5-15 seconds (depends on file size)
- **Audio Extraction:** 3-5 seconds
- **Video Editing:** 10-20 seconds
- **Caption Generation:** 15-30 seconds (OpenAI API)
- **Total Processing:** ~45-80 seconds

### Optimization Tips

1. Cache music files locally
2. Pre-generate captions async
3. Use video preview frames instead of full video
4. Implement CDN caching for outputs

## Security

### API Authentication

- All endpoints require JWT bearer token
- Rate limiting: 200 requests/minute per IP
- Audit logging for all requests

### Data Protection

- Affiliate links validated before storage
- User isolation via userId checks
- Temporary files cleaned up after processing
- No sensitive data in logs

### Credential Management

- Store API keys in environment variables
- Never commit credentials to repository
- Rotate keys regularly
- Use separate dev/prod credentials

## Monitoring

### Key Metrics

- Job success rate
- Average processing time
- Queue depth
- Failed job count
- Storage usage

### Alerts

Set up alerts for:
- Queue depth > 100
- Job failure rate > 10%
- Processing time > 2 minutes
- Dead letter queue > 5 items

## Roadmap

### Phase 2: Enhancement

- [ ] Bulk video creation (multiple products)
- [ ] Custom music upload
- [ ] Template variations
- [ ] A/B testing support
- [ ] Pinterest board automation

### Phase 3: Platform Expansion

- [ ] TikTok automation
- [ ] Instagram Reels support
- [ ] YouTube Shorts generation
- [ ] Cross-platform scheduling

## Support

For issues or questions:
1. Check dead letter queue: `SELECT * FROM queueDeadLetter`
2. Review worker logs: `npm run worker -- --debug`
3. Test API endpoint with sample data
4. Contact: support@adsamazing.com
