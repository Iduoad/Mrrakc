import json
import subprocess
import os

def get_git_root():
    """Finds the absolute path to the root of the git repo."""
    try:
        root = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()
        return root
    except subprocess.CalledProcessError:
        return None

def get_changed_json_files(repo_root):
    """Get a list of .json files changed in HEAD using git show."""
    # 'git show' is safer than diff-tree for the very first commit
    # --name-only: lists files
    # --format=: suppresses the commit message/header
    # --diff-filter=ACMR: Only Added, Copied, Modified, Renamed (ignores deleted)
    cmd = ["git", "show", "--name-only", "--format=", "--diff-filter=ACMR", "HEAD"]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print("❌ Error: Git command failed.")
        return []

    files = result.stdout.splitlines()
    
    # Debug: Show what git found
    # print(f"DEBUG: Git returned these files: {files}")

    valid_files = []
    for f in files:
        if f.endswith('.json'):
            # Combine repo root with the file path from git
            full_path = os.path.join(repo_root, f)
            if os.path.exists(full_path):
                valid_files.append(full_path)
    
    return valid_files

def add_tag_to_file(filepath, new_tag="Imlil"):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Initialize metadata/tags if they don't exist
        if "metadata" not in data:
            data["metadata"] = {}
        if "tags" not in data["metadata"]:
            data["metadata"]["tags"] = []

        tags = data["metadata"]["tags"]
            
        if new_tag not in tags:
            tags.append(new_tag)
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"✅ Updated: {os.path.basename(filepath)}")
        else:
            print(f"ℹ️  Skipped (Tag exists): {os.path.basename(filepath)}")

    except json.JSONDecodeError:
        print(f"❌ Error: Invalid JSON in {os.path.basename(filepath)}")
    except Exception as e:
        print(f"❌ Error processing {os.path.basename(filepath)}: {e}")

if __name__ == "__main__":
    root_dir = get_git_root()
    if not root_dir:
        print("❌ Error: Not a git repository.")
    else:
        print(f"📂 Scanning repo at: {root_dir}")
        files = get_changed_json_files(root_dir)
        
        if not files:
            print("⚠️  No JSON files found in the last commit.")
        else:
            print(f"Found {len(files)} JSON file(s). Processing...")
            for json_file in files:
                add_tag_to_file(json_file)
