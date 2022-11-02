file=$1

if [ -n "$file" ]
then
  npx jest --watch -- __test__/signal/$file.test.ts
else
  echo "please specific a test name"
fi

