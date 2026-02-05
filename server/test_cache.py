import sys
sys.path.insert(0, 'server')

from core.cache_manager import get_cache_manager

cache = get_cache_manager()

# Check cache directory
print(f"Cache directory: {cache.cache_dir}")
print(f"Cache directory exists: {cache.cache_dir.exists()}")

# Try to save test data
test_data = {"test": "data", "frames": [1, 2, 3]}
success = cache.set(2024, 1, "R", test_data)
print(f"Cache save successful: {success}")

# Try to read it back
loaded = cache.get(2024, 1, "R")
print(f"Cache load successful: {loaded is not None}")
print(f"Loaded data: {loaded}")

# List files in cache directory
import os
print("\nFiles in cache directory:")
for file in os.listdir(cache.cache_dir):
    print(f"  - {file}")